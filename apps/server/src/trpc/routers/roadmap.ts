import { z } from "zod";
import { generateLearningRoadmapByRoleName } from "@/engine/guidanceEngine";
import { router, publicProcedure } from "../index";

export const roadmapRouter = router({
    generate: publicProcedure
        .input(
            z.object({
                userId: z.string(),
                roleName: z.string(),
            })
        )
        .mutation(async ({ input }) => {
            const result = await generateLearningRoadmapByRoleName({
                userId: input.userId,
                roleName: input.roleName,
            });

            if ("message" in result) {
                return result;
            }

            return {
                totalSteps: result.totalSteps,
                roadmap: result.roadmap,
            };
        }),
});