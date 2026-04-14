import { router, publicProcedure } from "../index";
import { z } from "zod";
import { db } from "@/db";
import { userProgress, skillGapAnalysis, aiJobs } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dashboardRouter = router({
    getOverview: publicProcedure
        .input(z.object({ userId: z.string() }))
        .query(async ({ input }) => {
            
            // 1. Fetch Points
            const progress = await db.query.userProgress.findMany({
                where: eq(userProgress.userId, input.userId)
            });
            const totalPoints = progress.reduce((acc, curr) => acc + curr.points, 0);

            // 2. Fetch Readiness
            const gap = await db.query.skillGapAnalysis.findFirst({
                where: eq(skillGapAnalysis.userId, input.userId)
            });

            // 3. Fetch Recent Activity Logs
            const recentJobs = await db.query.aiJobs.findMany({
                where: eq(aiJobs.userId, input.userId)
            });

            return {
                readiness_score: gap?.readinessScore || 0,
                points: totalPoints,
                recent_activity: recentJobs
            };
        }),
});
