import { z } from "zod";
import { router, publicProcedure } from "../index";
import { db } from "@/db";
import { roles, roleSkills, skills } from "@/db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const rolesRouter = router({
    create: publicProcedure
        .input(
            z.object({
                name: z.string().trim().min(1),
            })
        )
        .mutation(async ({ input }) => {
            const inserted = await db
                .insert(roles)
                .values({
                    name: input.name,
                })
                .onConflictDoUpdate({
                    target: roles.name,
                    set: {
                        name: input.name,
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

    addSkill: publicProcedure
        .input(
            z.object({
                roleId: z.string().uuid(),
                skillId: z.string().uuid(),
                weight: z.number().positive(),
            })
        )
        .mutation(async ({ input }) => {
            const { roleId, skillId, weight } = input;

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
                    weight: weight.toString(),
                })
                .onConflictDoUpdate({
                    target: [roleSkills.roleId, roleSkills.skillId],
                    set: {
                        weight: weight.toString(),
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
});
