import { z } from "zod";
import {
    completeRoadmapNode,
    generateLearningRoadmap,
} from "@/modules/roadmap/service";
import { router, protectedProcedure } from "@/trpc/index";
import { db } from "@/db";
import { roadmaps, roadmapNodes, skillCurriculumNodes } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const roadmapRouter = router({
    generate: protectedProcedure
        .input(
            z.object({
                roleId: z.uuid(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const result = await generateLearningRoadmap({
                userId: ctx.session.user.id,
                roleId: input.roleId,
            });

            if ("message" in result) {
                return result;
            }

            return {
                roadmapId: result.roadmapId,
                totalNodes: result.totalNodes,
                nodes: result.nodes,
                skillsMissingCurriculum: result.skillsMissingCurriculum
            };
        }),

    completeNode: protectedProcedure
        .input(
            z.object({
                nodeId: z.string().uuid(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            return completeRoadmapNode({
                userId: ctx.session.user.id,
                nodeId: input.nodeId,
            });
        }),

    getActiveRoadmap: protectedProcedure
        .input(z.object({ roleId: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
            const roadmap = await db.query.roadmaps.findFirst({
                where: and(
                    eq(roadmaps.userId, ctx.session.user.id),
                    eq(roadmaps.roleId, input.roleId),
                    eq(roadmaps.isActive, true)
                ),
                with: {
                    nodes: {
                        columns: {
                            id: true,
                            orderIndex: true,
                            status: true,
                            completedAt: true,
                            priority: true,
                        },
                        orderBy: asc(roadmapNodes.orderIndex),
                        with: {
                            curriculumNode: {
                                columns: {
                                    title: true,
                                    skillId: true,
                                },
                                with: {
                                    skill: {
                                        columns: {
                                            name: true,
                                        },
                                    },
                                }
                            }
                        }
                    }
                }
            });

            if (!roadmap) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Roadmap not found"
                });
            }

            return {
                roadmapId: roadmap.id,
                totalNodes: roadmap.nodes.length,
                nodes: roadmap.nodes.map((node) => ({
                    orderIndex: node.orderIndex,
                    nodeId: node.id,
                    status: node.status,
                    curriculumTitle: node.curriculumNode.title,
                    skillName: node.curriculumNode.skill.name,
                    priority: node.priority,
                    completedAt: node.completedAt,
                })),
            };
        }),

    getUserRoadmaps: protectedProcedure
        .query(async ({ ctx }) => {
            return db.query.roadmaps.findMany({
                where: eq(roadmaps.userId, ctx.session.user.id),
                with: {
                    nodes: {
                        with: {
                            curriculumNode: {
                                with: {
                                    skill: true,
                                }
                            }
                        }
                    }
                }
            });
        }),

    deleteUserRoadmap: protectedProcedure
        .input(z.object({ roadmapId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
            const existing = await db.query.roadmaps.findFirst({
                where: and(
                    eq(roadmaps.id, input.roadmapId),
                    eq(roadmaps.userId, ctx.session.user.id)
                )
            });

            if (!existing) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Roadmap not found"
                });
            }

            await db.delete(roadmaps).where(eq(roadmaps.id, input.roadmapId));
            return { success: true };
        }),

    getNodeInfo: protectedProcedure
        .input(z.object({ nodeId: z.string().uuid() }))
        .query(async ({ input }) => {
            const node = await db.query.roadmapNodes.findFirst({
                columns: {
                    curriculumNodeId: true
                },
                where: eq(roadmapNodes.id, input.nodeId)
            });

            if (!node) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Node not found"
                });
            }

            return await db.query.skillCurriculumNodes.findFirst({
                where: eq(skillCurriculumNodes.id, node.curriculumNodeId),
                with: {
                    resources: true
                }
            });
        }),


});


