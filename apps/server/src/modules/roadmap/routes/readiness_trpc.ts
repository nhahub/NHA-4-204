import { z } from "zod";
import { evaluateUserForRoleName } from "@/modules/roles/service";
import { router, protectedProcedure } from "@/trpc/index";
import { db } from "@/db";
import { readinessReports, skillGapResults } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { user } from "@/db/schema";
import { githubStats } from "@/db/schema";
import { calculateTier } from "@/modules/roadmap/gamification";

export const readinessRouter = router({
    generate: protectedProcedure
        .input(
            z.object({
                roleName: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            return evaluateUserForRoleName({
                userId: ctx.session.user.id,
                roleName: input.roleName,
            });
        }),

    getLatestReport: protectedProcedure
        .input(
            z.object({
                roleId: z.string(),
            })
        )
        .query(async ({ ctx, input }) => {
            const report = await db.query.readinessReports.findFirst({
                where: and(
                    eq(readinessReports.userId, ctx.session.user.id),
                    eq(readinessReports.roleId, input.roleId)
                ),
                orderBy: desc(readinessReports.createdAt),
            });
            
            const gaps = await db.query.skillGapResults.findFirst({
                where: and(
                    eq(skillGapResults.userId, ctx.session.user.id),
                    eq(skillGapResults.roleId, input.roleId)
                ),
                orderBy: desc(skillGapResults.createdAt),
            });

            return {
                report,
                gaps
            };
        }),
        
    getUserReportsHistory: protectedProcedure
        .input(
            z.object({
                roleId: z.string(),
            })
        )
        .query(async ({ ctx, input }) => {
            return db.query.readinessReports.findMany({
                where: and(
                    eq(readinessReports.userId, ctx.session.user.id),
                    eq(readinessReports.roleId, input.roleId)
                ),
                orderBy: desc(readinessReports.createdAt),
            });
        }),

    getGlobalLeaderboard: protectedProcedure
        .input(z.object({ limit: z.number().default(10) }))
        .query(async ({ input }) => {
            const reports = await db
                .select({
                    userId: user.id,
                    name: user.name,
                    image: user.image,
                    roleId: readinessReports.roleId,
                    finalScore: readinessReports.overallReadinessScore,
                    activityScore: githubStats.activityScore,
                })
                .from(readinessReports)
                .innerJoin(user, eq(user.id, readinessReports.userId))
                .leftJoin(githubStats, eq(githubStats.userId, readinessReports.userId))
                .orderBy(desc(readinessReports.overallReadinessScore));

            const uniqueUsers = new Set<string>();
            const leaderboard = [];

            for (const r of reports) {
                if (uniqueUsers.has(r.userId)) continue;
                uniqueUsers.add(r.userId);

                const finalScoreNum = Number(r.finalScore);
                const activityScoreNum = Number(r.activityScore || 0);

                leaderboard.push({
                    userId: r.userId,
                    name: r.name,
                    image: r.image,
                    roleId: r.roleId,
                    finalScore: finalScoreNum,
                    activityScore: activityScoreNum,
                    tier: calculateTier(finalScoreNum, activityScoreNum),
                });

                if (leaderboard.length >= input.limit) break;
            }

            return leaderboard;
        }),

    getRoleLeaderboard: protectedProcedure
        .input(z.object({ roleId: z.string().uuid(), limit: z.number().default(10) }))
        .query(async ({ input }) => {
            const reports = await db
                .select({
                    userId: user.id,
                    name: user.name,
                    image: user.image,
                    finalScore: readinessReports.overallReadinessScore,
                    activityScore: githubStats.activityScore,
                })
                .from(readinessReports)
                .innerJoin(user, eq(user.id, readinessReports.userId))
                .leftJoin(githubStats, eq(githubStats.userId, readinessReports.userId))
                .where(eq(readinessReports.roleId, input.roleId))
                .orderBy(desc(readinessReports.overallReadinessScore));

            const uniqueUsers = new Set<string>();
            const leaderboard = [];

            for (const r of reports) {
                if (uniqueUsers.has(r.userId)) continue;
                uniqueUsers.add(r.userId);

                const finalScoreNum = Number(r.finalScore);
                const activityScoreNum = Number(r.activityScore || 0);

                leaderboard.push({
                    userId: r.userId,
                    name: r.name,
                    image: r.image,
                    roleId: input.roleId,
                    finalScore: finalScoreNum,
                    activityScore: activityScoreNum,
                    tier: calculateTier(finalScoreNum, activityScoreNum),
                });

                if (leaderboard.length >= input.limit) break;
            }

            return leaderboard;
        }),
});
