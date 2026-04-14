import { z } from "zod";
import { router, publicProcedure } from "../index";
import { db } from "@/db";
import { roadmaps, userProgress } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const roadmapRouter = router({
    generate: publicProcedure
        .input(z.object({ role: z.string() }))
        .mutation(async () => {
            // Generation logic is now handled by calling the AI worker internally
            return { jobId: "ai_orchestrator_handled" };
        }),
    get: publicProcedure
        .input(z.object({ userId: z.string() }))
        .query(async ({ input }) => {
            return await db.query.roadmaps.findMany({
                where: eq(roadmaps.userId, input.userId)
            });
        }),
    updateProgress: publicProcedure
        .input(z.object({ userId: z.string(), roadmapId: z.string(), completedSteps: z.array(z.string()), pointsAdded: z.number() }))
        .mutation(async ({ input }) => {
            const existing = await db.query.userProgress.findFirst({
                where: and(eq(userProgress.userId, input.userId), eq(userProgress.roadmapId, input.roadmapId))
            });

            if (existing) {
                const updated = await db.update(userProgress)
                    .set({
                        completedSteps: input.completedSteps,
                        points: existing.points + input.pointsAdded
                    })
                    .where(eq(userProgress.id, existing.id))
                    .returning();
                return updated[0];
            } else {
                const inserted = await db.insert(userProgress).values({
                    id: crypto.randomUUID(),
                    userId: input.userId,
                    roadmapId: input.roadmapId,
                    completedSteps: input.completedSteps,
                    points: input.pointsAdded
                }).returning();
                return inserted[0];
            }
        }),
});
