import { router, protectedProcedure } from "@/trpc/index";
import { TRPCError } from "@trpc/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";


export const userRouter = router({
 setAvailability : protectedProcedure
    .input(
        z.object({
            availableDaysPerWeek: z.number().min(1).max(7),
            availableHoursPerDay: z.number().min(1).max(24),
            
        })
    )
    .mutation(async ({input , ctx}) => {
        const userId = ctx.session.user.id;
        const { availableDaysPerWeek, availableHoursPerDay } = input;

        const [updatedUser] = await db
          .update(user)
          .set({ availableDaysPerWeek, availableHoursPerDay })
          .where(eq(user.id, userId))
          .returning();

        if (!updatedUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }

        return updatedUser;
    })
});