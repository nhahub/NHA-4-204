import { router, protectedProcedure } from "@/trpc/index";
import { z } from "zod";
import { generateCalendar } from "../services/generator";
import { db } from "@/db";
import { calendarEvents, calendarEventStatusEnum } from "../db/schema";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import { skillCurriculumNodes } from "@/modules/skills/db/curriculum_schema";
import { roadmapNodes } from "@/modules/roadmap/db/schema";
import { completeRoadmapNode } from "@/modules/roadmap/service";

export const calendarRouter = router({
    generate: protectedProcedure.mutation(async ({ ctx }) => {
        const events = await generateCalendar(ctx.session.user.id);
        return { 
            success: true,
            count: events.length,
            events: events
        };
    }),

    getCalendar: protectedProcedure
        .input(z.object({
            view: z.enum(["month", "week"]).optional(),
            from: z.string().optional(),
            to: z.string().optional(),
        }).optional().default({}))
        .query(async ({ ctx, input }) => {
            const today = new Date().toISOString().split("T")[0] || "";
            
            // Build where clause
            const conditions = [eq(calendarEvents.userId, ctx.session.user.id)];
            if (input.from) {
                const fromStr: string = input.from;
                conditions.push(gte(calendarEvents.date, fromStr));
            }
            if (input.to) {
                const toStr: string = input.to;
                conditions.push(lte(calendarEvents.date, toStr));
            }

            const events = await db
                .select({
                    event: calendarEvents,
                    nodeTitle: skillCurriculumNodes.title,
                    nodeDescription: skillCurriculumNodes.description,
                })
                .from(calendarEvents)
                .innerJoin(roadmapNodes, eq(calendarEvents.roadmapNodeId, roadmapNodes.id))
                .innerJoin(skillCurriculumNodes, eq(roadmapNodes.curriculumNodeId, skillCurriculumNodes.id))
                .where(and(...conditions))
                .orderBy(asc(calendarEvents.date), asc(calendarEvents.startTime));

            // Check if needs new schedule
            const futureScheduledEvents = await db.query.calendarEvents.findFirst({
                where: and(
                    eq(calendarEvents.userId, ctx.session.user.id),
                    eq(calendarEvents.status, "scheduled"),
                    gte(calendarEvents.date, today)
                )
            });

            return {
                events,
                needsNewSchedule: !futureScheduledEvents
            };
        }),

    getToday: protectedProcedure.query(async ({ ctx }) => {
        const today = new Date().toISOString().split("T")[0] || "";

        const events = await db
            .select({
                event: calendarEvents,
                nodeTitle: skillCurriculumNodes.title,
                nodeDescription: skillCurriculumNodes.description,
            })
            .from(calendarEvents)
            .innerJoin(roadmapNodes, eq(calendarEvents.roadmapNodeId, roadmapNodes.id))
            .innerJoin(skillCurriculumNodes, eq(roadmapNodes.curriculumNodeId, skillCurriculumNodes.id))
            .where(and(
                eq(calendarEvents.userId, ctx.session.user.id),
                eq(calendarEvents.date, today)
            ))
            .orderBy(asc(calendarEvents.startTime));

        const futureScheduledEvents = await db.query.calendarEvents.findFirst({
            where: and(
                eq(calendarEvents.userId, ctx.session.user.id),
                eq(calendarEvents.status, "scheduled"),
                gte(calendarEvents.date, today)
            )
        });

        return {
            events,
            needsNewSchedule: !futureScheduledEvents
        };
    }),

    updateEvent: protectedProcedure
        .input(z.object({
            eventId: z.string().uuid(),
            date: z.string().optional(),
            startTime: z.string().optional(),
            endTime: z.string().optional(),
            status: z.enum(calendarEventStatusEnum.enumValues).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { eventId, ...updates } = input;
            
            // Check ownership
            const event = await db.query.calendarEvents.findFirst({
                where: and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, ctx.session.user.id))
            });

            if (!event) throw new Error("Event not found or unauthorized");

            await db.update(calendarEvents)
                .set(updates)
                .where(eq(calendarEvents.id, eventId));

            if (updates.status === "completed" || updates.status === "skipped") {
                if (updates.status === "completed") {
                    await db.update(calendarEvents)
                        .set({ status: "skipped" })
                        .where(
                            and(
                                eq(calendarEvents.roadmapNodeId, event.roadmapNodeId),
                                eq(calendarEvents.userId, ctx.session.user.id),
                                eq(calendarEvents.status, "scheduled"),
                                lte(calendarEvents.sessionIndex, event.sessionIndex - 1)
                            )
                        );
                }

                const nodeEvents = await db.query.calendarEvents.findMany({
                    where: and(
                        eq(calendarEvents.roadmapNodeId, event.roadmapNodeId),
                        eq(calendarEvents.userId, ctx.session.user.id)
                    )
                });
                
                const allDone = nodeEvents.length >= event.totalSessionsForNode && nodeEvents.every(e => 
                    e.status === "completed" || e.status === "skipped"
                );

                if (allDone) {
                    try {
                        await completeRoadmapNode({
                            userId: ctx.session.user.id,
                            nodeId: event.roadmapNodeId,
                        });
                    } catch (e) {
                        console.error("Failed to automatically complete roadmap node", e);
                    }
                } else if (updates.status === "completed") {
                    await db.update(roadmapNodes)
                        .set({ status: "inProgress" })
                        .where(
                            and(
                                eq(roadmapNodes.id, event.roadmapNodeId),
                                eq(roadmapNodes.status, "pending")
                            )
                        );
                }
            }

            return { success: true };
        }),

    deleteEvent: protectedProcedure
        .input(z.object({ eventId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
            await db.delete(calendarEvents)
                .where(and(eq(calendarEvents.id, input.eventId), eq(calendarEvents.userId, ctx.session.user.id)));
            return { success: true };
        }),
});
