import { z } from "zod";
import { router, publicProcedure } from "../index";
import { db } from "@/db";
import { skills, skillDependencies } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
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

            return await db.transaction(async (tx) => {
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
});