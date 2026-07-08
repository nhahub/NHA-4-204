import { z } from "zod";
import { router, protectedProcedure } from "@/trpc/index";
import { db } from "@/db";
import {  curriculumNodeResources, skillCurriculumNodes, skills } from "@/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";



export const curriculumRouter = router({
    
    // Bulk insert which remove the old curriculum and add the new curriculum if curriculum already exists
    addCurriculumNodesForSkill: protectedProcedure
        .input(
            z.array(
                z.object({
                    skillId: z.string().uuid(),
                    nodes: z.array(
                        z.object({
                            orderIndex: z.number().int().min(0),
                            title: z.string().trim().min(1),
                            description: z.string().trim().min(1),
                        })
                    ).min(1),
                })
            ).min(1)
        )
        .mutation(async ({ input }) => {

            const inserted: any[] = [];
            const failed: any[] = [];
            for (const skill of input) {
                const existingSkill = await db.query.skills.findFirst({
                    where: eq(skills.id, skill.skillId),
                });

                if (!existingSkill) {
                    failed.push({
                        skillId: skill.skillId,
                        reason: "Skill not found",
                    });
                    continue;
                }

                const nodesToUpsert = skill.nodes.map((node) => ({
                    ...node,
                    skillId: skill.skillId,
                }));

                const result = await db
                    .insert(skillCurriculumNodes)
                    .values(nodesToUpsert)
                    .onConflictDoUpdate({
                        target: [skillCurriculumNodes.skillId, skillCurriculumNodes.orderIndex],
                        set: {
                            title: sql.raw(`excluded.title`),
                            description: sql.raw(`excluded.description`),
                        },
                    })
                    .returning();

                inserted.push(...result);
            }
           return {
                inserted,
                failed
            };
        }),

    updateCurriculumNodesForSkill: protectedProcedure
        .input(
            z.object({
                skillId: z.string().uuid(),
                nodes: z.array(
                    z.object({
                        orderIndex: z.number().int().min(0),
                        title: z.string().trim().min(1),
                        description: z.string().trim().min(1),
                    })
                ).min(1),
            })
        )
        .mutation(async ({ input }) => {
            const existingSkill = await db.query.skills.findFirst({
                where: eq(skills.id, input.skillId),
            });

            if (!existingSkill) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Skill not found",
                });
            }

            const nodesToUpsert = input.nodes.map((node) => ({
                ...node,
                skillId: input.skillId,
            }));

            const upserted = await db
                .insert(skillCurriculumNodes)
                .values(nodesToUpsert)
                .onConflictDoUpdate({
                    target: [skillCurriculumNodes.skillId, skillCurriculumNodes.orderIndex],
                    set: {
                        title: sql.raw(`excluded.title`),
                        description: sql.raw(`excluded.description`),
                    },
                })
                .returning();

            return upserted;
        }),

    getCurriculumNodes: protectedProcedure
        .input(z.object({ skillId: z.string().uuid() }))
        .query(async ({ input }) => {
            const nodes = await db.query.skillCurriculumNodes.findMany({
                where: eq(skillCurriculumNodes.skillId, input.skillId),
                orderBy: asc(skillCurriculumNodes.orderIndex),
                with: {
                    resources: {
                        orderBy: asc(curriculumNodeResources.displayOrder),
                    },
                },
            });

            if (!nodes || nodes.length === 0) {
                throw new TRPCError({ code: "NOT_FOUND", message: "No curriculum nodes found for this skill" });
            }

            return nodes;
        }),

    updateCurriculumNode: protectedProcedure
        .input(
            z.object({
                id: z.string().uuid(),
                orderIndex: z.number().int().min(0).optional(),
                title: z.string().trim().min(1).optional(),
                description: z.string().trim().min(1).optional(),
            })
        )
        .mutation(async ({ input }) => {
            const existing = await db.query.skillCurriculumNodes.findFirst({ where: eq(skillCurriculumNodes.id, input.id) });
            if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Curriculum node not found" });

            const updatePayload: Record<string, unknown> = {};
            if (typeof input.orderIndex === "number") updatePayload.orderIndex = input.orderIndex;
            if (typeof input.title === "string") updatePayload.title = input.title;
            if (typeof input.description === "string") updatePayload.description = input.description;

            const updated = await db.update(skillCurriculumNodes).set(updatePayload).where(eq(skillCurriculumNodes.id, input.id)).returning();
            return updated[0];
        }), 

    deleteCurriculumNode: protectedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ input }) => {
            const existing = await db.query.skillCurriculumNodes.findFirst({
                where: eq(skillCurriculumNodes.id, input.id),
            });

            if (!existing) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Curriculum node not found" });
            }

            await db.delete(skillCurriculumNodes).where(eq(skillCurriculumNodes.id, input.id));
            return { success: true };
        }),
});