import { z } from "zod";
import { router, publicProcedure } from "../index";
import { db } from "@/db";
import { userSkills, skillGapAnalysis } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const skillsRouter = router({
    getUserSkills: publicProcedure
        .input(z.object({ userId: z.string() }))
        .query(async ({ input }) => {
            const result = await db.query.userSkills.findFirst({
                where: eq(userSkills.userId, input.userId)
            });
            return result || { skills: [] };
        }),
    getSkillGap: publicProcedure
        .input(z.object({ userId: z.string(), role: z.string() }))
        .query(async ({ input }) => {
            const result = await db.query.skillGapAnalysis.findFirst({
                where: and(
                    eq(skillGapAnalysis.userId, input.userId),
                    eq(skillGapAnalysis.role, input.role)
                )
            });
            return result || { missing_skills: [], readiness_score: 0 };
        }),
});
