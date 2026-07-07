import { z } from "zod";
import { router, protectedProcedure } from "@/trpc/index";
import { db } from "@/db";
import { roles, roleSkills, skills, user } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { evaluateUserForRoleName } from "../service";

export const rolesRouter = router({
    create: protectedProcedure
        .input(
            z.object({
                title: z.string().trim().min(1),
                description: z.string().trim().min(1).optional()
            })
        )
        .mutation(async ({ input }) => {
            const inserted = await db
                .insert(roles)
                .values({
                    title: input.title,
                    description:input.description
                })
                .onConflictDoUpdate({
                    target: roles.title,
                    set: {
                        title: input.title,
                        description:input.description
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

    addSkills: protectedProcedure
        .input(
            z.object({
                roleId: z.string().uuid(),
                skills: z.array(
                    z.object({
                        skillId: z.string().uuid(),
                        isCore: z.boolean().default(false),
                    })
                ).min(1),
            })
        )
        .mutation(async ({ input }) => {
            const { roleId, skills: skillsInput } = input;

            // Validate role exists
            const role = await db.query.roles.findFirst({ where: eq(roles.id, roleId) });
            if (!role) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Role not found",
                });
            }

            // Validate all skills exist
            const skillIds = skillsInput.map(s => s.skillId);
            const existingSkills = await db.query.skills.findMany({
                where: (skills, { inArray }) => inArray(skills.id, skillIds),
            });

            if (existingSkills.length !== skillIds.length) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Some skills not found",
                });
            }

            // Batch insert with conflict handling
            const inserted = await db
                .insert(roleSkills)
                .values(
                    skillsInput.map(s => ({
                        roleId,
                        skillId: s.skillId,
                        isCore: s.isCore,
                    }))
                )
                .onConflictDoUpdate({
                    target: [roleSkills.roleId, roleSkills.skillId],
                    set: {
                         isCore: sql.raw(`excluded.is_core`),
                    },
                })
                .returning();

            if (inserted.length === 0) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to assign skills to role",
                });
            }

            return inserted;
        }),

    getAllRoles: protectedProcedure
        .input(z.object({ includeScore:z.boolean()}))
        .query(async ({ ctx , input }) => {
            const rolesData =await db.query.roles.findMany({
                orderBy: (roles, { asc }) => [asc(roles.title)],
            });

            if(!input.includeScore) return rolesData; 

            const userId = ctx.session.user.id;
            const RolesScore = await Promise.all(rolesData.map(async (role)=>{
               const evaluation = await evaluateUserForRoleName({
                    userId: userId ,
                    roleName: role.title,
                });
                return{
                    ...role,
                    "score":evaluation.finalScore
                }
            }));
            
            return RolesScore;
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
                        columns:{
                            roleId: false,
                            skillId: false,
                        },
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

