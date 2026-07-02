import { z } from "zod";
import { router, publicProcedure } from "@/trpc/index";
import { db } from "@/db";
import { user } from "@/db/schema";
import { TRPCError } from "@trpc/server";

export const authRouter = router({
    createUser: publicProcedure
        .input(
            z.object({
                id: z.string().trim().min(1),
                name: z.string().trim().min(1),
                email: z.string().email(),
            })
        )
        .mutation(async ({ input }) => {
            const { id, name, email } = input;

            const inserted = await db
                .insert(user)
                .values({
                    id,
                    name,
                    email,
                    emailVerified: false,
                })
                .onConflictDoUpdate({
                    target: user.id,
                    set: {
                        name,
                        email,
                    },
                })
                .returning();

            const createdUser = inserted[0];
            if (!createdUser) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to create user",
                });
            }

            return createdUser;
        }),

});
