import { router, protectedProcedure } from "@/trpc/index";
import { TRPCError } from "@trpc/server";
import { db } from "@/db";
import { user, roadmaps, roles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";


export const userRouter = router({
    getUserInfo: protectedProcedure
        .query(async ({ ctx }) => {
            const userInfo = await db.query.user.findFirst({
                where: eq(user.id, ctx.session.user.id)
            });

            if (!userInfo) {
                throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
            }

            return userInfo;
        }),

    setAvailability : protectedProcedure
    .input(
        z.object({
            availableDaysPerWeek: z.number().min(1).max(7),
            availableHoursPerDay: z.number().min(1).max(24),
            availableWeekdays: z.array(z.number().min(0).max(6)).optional(),
        })
    )
    .mutation(async ({input , ctx}) => {
        const userId = ctx.session.user.id;
        const { availableDaysPerWeek, availableHoursPerDay, availableWeekdays } = input;

        const [updatedUser] = await db
          .update(user)
          .set({ availableDaysPerWeek, availableHoursPerDay, availableWeekdays })
          .where(eq(user.id, userId))
          .returning();

        if (!updatedUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }

        return updatedUser;
    }),

    getUserRoleInfo: protectedProcedure
        .query(async ({ ctx }) => {
            const activeRoadmap = await db.query.roadmaps.findFirst({
                where: and(
                    eq(roadmaps.userId, ctx.session.user.id),
                    eq(roadmaps.isActive, true)
                )
            });

            if (!activeRoadmap) {
                throw new TRPCError({ code: "NOT_FOUND", message: "No active roadmap found" });
            }

            const role = await db.query.roles.findFirst({
                where: eq(roles.id, activeRoadmap.roleId)
            });

            if (!role) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });
            }

            return role;
        })
});