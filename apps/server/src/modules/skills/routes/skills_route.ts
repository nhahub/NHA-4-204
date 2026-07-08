import { z } from "zod";
import { router, protectedProcedure } from "@/trpc/index";
import { db } from "@/db";
import { skills, skillDependencies, userSkills, user } from "@/db/schema";
import { addManualSkill } from "@/modules/skills/service";
import { normalizeSkillName } from "@/modules/github/utils";
import { and, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const SKILL_SEARCH_SIMILARITY_THRESHOLD = Number(process.env.SKILL_SEARCH_SIMILARITY_THRESHOLD) || 0.3;

export const skillsRouter = router({
    create: protectedProcedure
        .input(
            z.array(
                z.object({
                    name: z.string().trim().min(1),
                    hasNoDependencies: z.boolean(),
                    dependencyIds: z.array(z.string()).optional(),
                })
            ).min(1)
        )
        .mutation(async ({ input }) => {
            return db.transaction(async (tx) => {
                const createdSkills: Array<{ id: string; name: string; hasNoDependencies: boolean }> = [];

                for (const skillInput of input) {
                    const { name, hasNoDependencies, dependencyIds } = skillInput;
                    const uniqueDependencyIds: string[] = [
                        ...new Set(
                            (dependencyIds ?? [])
                                .map((value) => value.trim())
                                .filter((value) => value.length > 0)
                        )
                    ];

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
                            normalizedName: normalizeSkillName(name),
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

                    if (uniqueDependencyIds.length > 0) {
                        const dependencyUuidIds = uniqueDependencyIds.filter((value) =>
                            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value)
                        );

                        const actualDependencyIds: string[] = [];
                        const missingDependencies: string[] = [];

                        for (const identifier of uniqueDependencyIds) {
                            if (dependencyUuidIds.includes(identifier)) {
                                actualDependencyIds.push(identifier);
                                continue;
                            }

                            const normalizedIdentifier = normalizeSkillName(identifier);
                            const candidates = await tx
                                .select({ id: skills.id, name: skills.name, normalizedName: skills.normalizedName })
                                .from(skills)
                                .where(
                                    sql`similarity(${skills.normalizedName}, ${normalizedIdentifier}) > ${SKILL_SEARCH_SIMILARITY_THRESHOLD}`
                                )
                                .orderBy(
                                    sql`similarity(${skills.normalizedName}, ${normalizedIdentifier}) DESC`
                                )
                                .limit(1);

                            if (candidates.length === 0) {
                                missingDependencies.push(identifier);
                                continue;
                            }

                            const topCandidate = candidates[0];
                            if (!topCandidate) {
                                missingDependencies.push(identifier);
                                continue;
                            }

                            actualDependencyIds.push(topCandidate.id);
                        }

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

                        for (const depId of actualDependencyIds) {
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

                        await tx.insert(skillDependencies).values(
                            actualDependencyIds.map((depId) => ({
                                skillId: createdSkill.id,
                                dependsOnSkillId: depId,
                            }))
                        );
                    }

                    createdSkills.push(createdSkill);
                }

                return createdSkills;
            });
        }),

    addUserSkill: protectedProcedure
        .input(
            z.object({
                skillId: z.string().uuid(),
                strengthScore: z.number(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { skillId } = input;
            const userId = ctx.session.user.id;
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

    updateUserSkill: protectedProcedure
        .input(
            z.object({
                skillId: z.string().uuid(),
                strengthScore: z.number(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const strengthScore = clampStrength(input.strengthScore);

            const updated = await db
                .update(userSkills)
                .set({
                    strengthScore: strengthScore.toString(),
                })
                .where(
                    and(
                        eq(userSkills.userId, ctx.session.user.id),
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
                userId: ctx.session.user.id,
                skillId: input.skillId,
                strengthScore,
            };
        }),

    getUserSkills: protectedProcedure
        .query(async ({ ctx }) => {
            const userId = ctx.session.user.id;
            const rows = await db
                .select({
                    userId: userSkills.userId,
                    skillId: userSkills.skillId,
                    skillName: skills.name,
                    strengthScore: userSkills.strengthScore,
                })
                .from(userSkills)
                .innerJoin(skills, eq(skills.id, userSkills.skillId))
                .where(eq(userSkills.userId, userId));

            return rows.map((row) => ({
                userId: row.userId,
                skillId: row.skillId,
                skillName: row.skillName,
                strengthScore: Number(row.strengthScore),
            }));
        }),

    getAllSkills: protectedProcedure
        .query(async () => {
            return db.query.skills.findMany({
                orderBy: (skills, { asc }) => [asc(skills.name)],
            });
        }),

    addManualSkill: protectedProcedure
        .input(
            z.array(
                z.object({
                    skillName: z.string().trim().min(1),
                    level: z.enum(["beginner", "intermediate", "expert"]).nullable(),
                })
            ).min(1)
        )
        .mutation(async ({ input, ctx }) => {
            const results = await Promise.all(
                input.map((skill) =>
                    addManualSkill({
                        userId: ctx.session.user.id,
                        skillName: skill.skillName,
                        level: skill.level,
                    })
                )
            );
            const added = results.filter((skill) => skill && skill.skillId != null);
            const missing = results
                .filter((r: any) => r && Object.prototype.hasOwnProperty.call(r, "error"))
                .map((r: any) => ({ skillName: r.skillName, message: r.error }));

            return { added, missing };
        }),

    searchSkill: protectedProcedure
        .input(
            z.object({
                skillWords: z.string().trim().min(2)
            })
        )
        .query(
            async ({ input })=>{
                const normalizedWords = normalizeSkillName(input.skillWords) ;
                console.log(normalizedWords);
                const matchedSkills = await db
                    .select({
                        id: skills.id,
                        name: skills.name
                    })
                    .from(skills)
                    .where(sql`${skills.normalizedName} ILIKE ${"%"+normalizedWords + "%"}`)
                    .orderBy(sql`similarity(${skills.normalizedName}, ${normalizedWords}) DESC`)
                    .limit(10);
                console.log(matchedSkills , matchedSkills[0] , matchedSkills.length);
                
                return matchedSkills.map((skill)=>({
                    name: skill.name,
                    id: skill.id
                }));
            }
        ),
});

function clampStrength(value: number) {
    return Math.min(100, Math.max(0, value));
}
