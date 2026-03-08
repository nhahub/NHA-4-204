import { z } from "zod";
import { evaluateUserForRoleName } from "@/engine/roleEngine";
import { router, publicProcedure } from "../index";

export const readinessRouter = router({
    generate: publicProcedure
        .input(
            z.object({
                userId: z.string(),
                roleName: z.string(),
            })
        )
        .mutation(async ({ input }) => {
            return evaluateUserForRoleName({
                userId: input.userId,
                roleName: input.roleName,
            });
        }),
});