import { z } from "zod";
import { router, publicProcedure } from "../index";
import { db } from "@/db";
import { skills, skillDependencies, userSkills, user } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const skillsRouter = router({
    create: publicProcedure
        .input(
            z.object({
                name: z.string().trim().min(1),
                hasNoDependencies: z.boolean(),
                dependencyIds: z.array(z.string()).optional(),
            })
        )
        .mutation(async ({ input }) => {
            const { name, hasNoDependencies, dependencyIds } = input;
            const uniqueDependencyIds = [...new Set(dependencyIds ?? [])];

            return db.transaction(async (tx) => {
                if (hasNoDependencies && uniqueDependencyIds.length > 0) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message:
                        "Skill marked hasNoDependencies cannot have dependencies."
                    });
                }

                if (!hasNoDependencies && uniqueDependencyIds.length === 0) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message:
                        "Skill must have dependencies or be marked hasNoDependencies = true."
                    });
                }

                const inserted = await tx
                    .insert(skills)
                    .values({
                        name,
                        hasNoDependencies,
                    })
                    .returning();

                const skill = inserted[0];
                if (!skill) {
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Skill insert failed",
                    });
                }
                const createdSkill = skill;

                if (uniqueDependencyIds.length === 0) {
                    return createdSkill;
                }

                const existingDependencies = await tx
                    .select({ id: skills.id })
                    .from(skills)
                    .where(inArray(skills.id, uniqueDependencyIds));

                const existingDependencyIds = new Set(
                    existingDependencies.map((row) => row.id)
                );

                const missingDependencies = uniqueDependencyIds.filter(
                    (id) => !existingDependencyIds.has(id)
                );

                if (missingDependencies.length > 0) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: `Dependency skills not found: ${missingDependencies.join(", ")}`,
                    });
                }

                // ---- CYCLE DETECTION ----

                const visited = new Set<string>();

                async function dfs(currentSkillId: string): Promise<boolean> {
                    if (currentSkillId === createdSkill.id) {
                        return true; // cycle found
                    }

                    if (visited.has(currentSkillId)) return false;
                    visited.add(currentSkillId);

                    const deps = await tx
                        .select()
                        .from(skillDependencies)
                        .where(eq(skillDependencies.skillId, currentSkillId));

                    for (const dep of deps) {
                        if (await dfs(dep.dependsOnSkillId)) {
                            return true;
                        }
                    }

                    return false;
                }

                for (const depId of uniqueDependencyIds) {
                    if (depId === createdSkill.id) {
                        throw new TRPCError({
                            code: "BAD_REQUEST",
                            message: "Skill cannot depend on itself.",
                        });
                    }

                    const cycle = await dfs(depId);
                    if (cycle) {
                        throw new TRPCError({
                            code: "BAD_REQUEST",
                            message: "Circular dependency detected.",
                        });
                    }
                }

                // ---- INSERT DEPENDENCIES ----

                await tx.insert(skillDependencies).values(
                    uniqueDependencyIds.map((depId) => ({
                        skillId: createdSkill.id,
                        dependsOnSkillId: depId,
                    }))
                );

                return createdSkill;
            });
        }),

    addUserSkill: publicProcedure
        .input(
            z.object({
                userId: z.string().trim().min(1),
                skillId: z.string().uuid(),
                strengthScore: z.number(),
            })
        )
        .mutation(async ({ input }) => {
            const { userId, skillId } = input;
            const strengthScore = clampStrength(input.strengthScore);

            const existingUser = await db.query.user.findFirst({
                where: eq(user.id, userId),
            });

            if (!existingUser) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "User not found",
                });
            }

            const skill = await db.query.skills.findFirst({
                where: eq(skills.id, skillId),
            });

            if (!skill) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Skill not found",
                });
            }

            const insertedUserSkills = await db
                .insert(userSkills)
                .values({
                    userId,
                    skillId,
                    strengthScore: strengthScore.toString(),
                })
                .onConflictDoUpdate({
                    target: [userSkills.userId, userSkills.skillId],
                    set: {
                        strengthScore: strengthScore.toString(),
                    },
                })
                .returning();

            const userSkill = insertedUserSkills[0];
            if (!userSkill) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to save user skill",
                });
            }

            return {
                userId: userSkill.userId,
                skillId: userSkill.skillId,
                skillName: skill.name,
                strengthScore: Number(userSkill.strengthScore),
            };
        }),

    updateUserSkill: publicProcedure
        .input(
            z.object({
                userId: z.string().trim().min(1),
                skillId: z.string().uuid(),
                strengthScore: z.number(),
            })
        )
        .mutation(async ({ input }) => {
            const strengthScore = clampStrength(input.strengthScore);

            const updated = await db
                .update(userSkills)
                .set({
                    strengthScore: strengthScore.toString(),
                })
                .where(
                    and(
                        eq(userSkills.userId, input.userId),
                        eq(userSkills.skillId, input.skillId)
                    )
                )
                .returning();

            const userSkill = updated[0];

            if (!userSkill) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "User skill not found",
                });
            }

            return {
                userId: input.userId,
                skillId: input.skillId,
                strengthScore,
            };
        }),

    getUserSkills: publicProcedure
        .input(
            z.object({
                userId: z.string().trim().min(1),
            })
        )
        .query(async ({ input }) => {
            const rows = await db
                .select({
                    userId: userSkills.userId,
                    skillId: userSkills.skillId,
                    skillName: skills.name,
                    strengthScore: userSkills.strengthScore,
                })
                .from(userSkills)
                .innerJoin(skills, eq(skills.id, userSkills.skillId))
                .where(eq(userSkills.userId, input.userId));

            return rows.map((row) => ({
                userId: row.userId,
                skillId: row.skillId,
                skillName: row.skillName,
                strengthScore: Number(row.strengthScore),
            }));
        }),
});

function clampStrength(value: number) {
    return Math.min(100, Math.max(0, value));
}