import { z } from "zod";
import { router, protectedProcedure } from "@/trpc/index";
import { db } from "@/db";
import { roles, roleSkills, skills, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const rolesRouter = router({
    create: protectedProcedure
        .input(
            z.object({
                title: z.string().trim().min(1),
            })
        )
        .mutation(async ({ input }) => {
            const inserted = await db
                .insert(roles)
                .values({
                    title: input.title,
                })
                .onConflictDoUpdate({
                    target: roles.title,
                    set: {
                        title: input.title,
                    },
                })
                .returning();

            const role = inserted[0];
            if (!role) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to create role",
                });
            }

            return role;
        }),

    addSkill: protectedProcedure
        .input(
            z.object({
                roleId: z.string().uuid(),
                skillId: z.string().uuid(),
                isCore: z.boolean().default(false),
            })
        )
        .mutation(async ({ input }) => {
            const { roleId, skillId, isCore } = input;

            const [role, skill] = await Promise.all([
                db.query.roles.findFirst({ where: eq(roles.id, roleId) }),
                db.query.skills.findFirst({ where: eq(skills.id, skillId) }),
            ]);

            if (!role) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Role not found",
                });
            }

            if (!skill) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Skill not found",
                });
            }

            const inserted = await db
                .insert(roleSkills)
                .values({
                    roleId,
                    skillId,
                    isCore,
                })
                .onConflictDoUpdate({
                    target: [roleSkills.roleId, roleSkills.skillId],
                    set: {
                        isCore,
                    },
                })
                .returning();

            const roleSkill = inserted[0];
            if (!roleSkill) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to assign skill to role",
                });
            }

            return roleSkill;
        }),

    getAllRoles: protectedProcedure
        .query(async () => {
            return db.query.roles.findMany({
                orderBy: (roles, { asc }) => [asc(roles.title)],
            });
        }),

    setUserRole: protectedProcedure
        .input(z.object({ roleId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
            const updated = await db
                .update(user)
                .set({ roleId: input.roleId })
                .where(eq(user.id, ctx.session.user.id))
                .returning();
            
            if (!updated[0]) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to update user role",
                });
            }
            return updated[0];
        }),

    getRoleById: protectedProcedure
        .input(z.object({ roleId: z.string().uuid() }))
        .query(async ({ input }) => {
            const role = await db.query.roles.findFirst({
                where: eq(roles.id, input.roleId),
                with: {
                    skills: {
                        with: {
                            skill: true
                        }
                    }
                }
            });

            if (!role) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Role not found",
                });
            }

            return role;
        }),
});

