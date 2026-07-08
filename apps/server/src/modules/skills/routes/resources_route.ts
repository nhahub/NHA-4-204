import { z } from "zod";
import { router, protectedProcedure } from "@/trpc/index";
import { db } from "@/db";
import {  curriculumNodeResources, skillCurriculumNodes } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const ResourcesRouter = router({ 
    // Bulk insert
    addResourcesForCurriculumNodes: protectedProcedure
        .input(
            z.array(
                z.object({
                    curriculumNodeId: z.string().uuid(),
                    resources: z.array(
                        z.object({
                            title: z.string().trim().min(1),
                            type: z.string().trim().min(1),
                            url: z.string().trim().url(),
                            displayOrder: z.number().int().min(0),
                        })
                    ).min(1),
                })
            ).min(1)
        )
        .mutation(async ({ input }) => {
            const inserted: any[] = [];
            const failed: any[] = [];

            for (const node of input) {
                const existingNode = await db.query.skillCurriculumNodes.findFirst({
                    where: eq(skillCurriculumNodes.id, node.curriculumNodeId),
                });

                if (!existingNode) {
                    failed.push({
                        curriculumNodeId:node.curriculumNodeId,
                        reason: "curriculumNode not found",
                    })
                    continue; 
                }

                await db.transaction(async (tx) => {
                    await tx
                        .delete(curriculumNodeResources)
                        .where(
                            eq(
                                curriculumNodeResources.curriculumNodeId,
                                node.curriculumNodeId
                            )
                        );

                    const result = await tx
                        .insert(curriculumNodeResources)
                        .values(
                            node.resources.map((resource) => ({
                                curriculumNodeId: node.curriculumNodeId,
                                ...resource,
                            }))
                        )
                        .returning();

                    inserted.push(...result);
                });
            }

            return {
                inserted,
                failed
            };
        }),

    updateResourcesForCurriculumNode: protectedProcedure
        .input(
            z.object({
                curriculumNodeId: z.string().uuid(),
                resources: z.array(
                    z.object({
                        title: z.string().trim().min(1),
                        type: z.string().trim().min(1),
                        url: z.string().trim().url(),
                        displayOrder: z.number().int().min(0),
                    })
                ).min(1),
            })
        )
        .mutation(async ({ input }) => {
            const existingNode = await db.query.skillCurriculumNodes.findFirst({
                where: eq(skillCurriculumNodes.id, input.curriculumNodeId),
            });

            if (!existingNode) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Curriculum node not found",
                });
            }

            const resourcesToUpsert = input.resources.map((resource) => ({
                curriculumNodeId: input.curriculumNodeId,
                title: resource.title,
                type: resource.type,
                url: resource.url,
                displayOrder: resource.displayOrder,
            }));

            const upserted = await db
                .insert(curriculumNodeResources)
                .values(resourcesToUpsert)
                .onConflictDoUpdate({
                    target: [curriculumNodeResources.curriculumNodeId, curriculumNodeResources.url],
                    set: {
                        title: sql.raw(`excluded.title`),
                        type: sql.raw(`excluded.type`),
                        displayOrder: sql.raw(`excluded.display_order`),
                    },
                })
                .returning();

            return upserted;
        }),

    getCurriculumNodeResource: protectedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .query(async ({ input }) => {
            const resource = await db.query.curriculumNodeResources.findFirst({ where: eq(curriculumNodeResources.id, input.id) });
            if (!resource) throw new TRPCError({ code: "NOT_FOUND", message: "Resource not found" });
            return resource;
        }),

    updateCurriculumNodeResource: protectedProcedure
        .input(
            z.object({
                id: z.string().uuid(),
                title: z.string().trim().min(1).optional(),
                type: z.string().trim().min(1).optional(),
                url: z.string().trim().url().optional(),
                displayOrder: z.number().int().min(0).optional(),
            })
        )
        .mutation(async ({ input }) => {
            const existing = await db.query.curriculumNodeResources.findFirst({ where: eq(curriculumNodeResources.id, input.id) });
            if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Resource not found" });

            const updatePayload: Record<string, unknown> = {};
            if (typeof input.title === "string") updatePayload.title = input.title;
            if (typeof input.type === "string") updatePayload.type = input.type;
            if (typeof input.url === "string") updatePayload.url = input.url;
            if (typeof input.displayOrder === "number") updatePayload.displayOrder = input.displayOrder;

            const updated = await db.update(curriculumNodeResources).set(updatePayload).where(eq(curriculumNodeResources.id, input.id)).returning();
            return updated[0];
        }),

    deleteCurriculumNodeResource: protectedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ input }) => {
            const existing = await db.query.curriculumNodeResources.findFirst({ where: eq(curriculumNodeResources.id, input.id) });
            if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Resource not found" });

            await db.delete(curriculumNodeResources).where(eq(curriculumNodeResources.id, input.id));
            return { success: true };
        }),
});