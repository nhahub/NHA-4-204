import { z } from "zod";
import { syncGithubSkillsForUser } from "@/engine/skillEngine";
import { publicProcedure, router } from "../index";

export const githubRouter = router({
    sync: publicProcedure
        .input(
            z.object({
                userId: z.string(),
                username: z.string(),
            })
        )
        .mutation(async ({ input }) => {
            return syncGithubSkillsForUser({
                userId: input.userId,
                githubUsername: input.username,
            });
        }),
});
