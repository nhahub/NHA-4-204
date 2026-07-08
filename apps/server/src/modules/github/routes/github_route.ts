import { z } from "zod";
import { syncGithubSkillsForUser } from "@/modules/skills/service";
import { protectedProcedure, router } from "@/trpc/index";
import { db } from "@/db";
import { githubStats, projects, projectSkills } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const githubRouter = router({
    syncProjects: protectedProcedure
        .input(
            z.object({
                username: z.string(),
            }) 
        )
        .mutation(async ({ ctx, input }) => {
            return syncGithubSkillsForUser({
                userId: ctx.session.user.id,
                githubUsername: input.username,
            });
        }),

    getStats: protectedProcedure
        .query(async ({ ctx }) => {
            return db.query.githubStats.findFirst({
                where: eq(githubStats.userId, ctx.session.user.id)
            });
        }),
        
    getProjects: protectedProcedure
        .query(async ({ ctx }) => {
            return db.query.projects.findMany({
                where: eq(projects.userId, ctx.session.user.id),
                orderBy: desc(projects.complexityScore)
            });
        }),
        
    addManualProject: protectedProcedure
        .input(z.object({
            title: z.string().min(1),
            description: z.string().optional(),
            complexityLevel: z.enum(["simple", "moderate", "complex"])
        }))
        .mutation(async ({ ctx, input }) => {
            let score = 5;
            if (input.complexityLevel === "moderate") score = 15;
            if (input.complexityLevel === "complex") score = 30;
            
            return db.insert(projects).values({
                userId: ctx.session.user.id,
                title: input.title,
                description: input.description || "",
                source: "manual",
                complexityScore: score
            })
            .onConflictDoUpdate({
                target: [projects.userId, projects.title],
                set: {
                    description: input.description || "",
                    complexityScore: score
                }
            })
            .returning();
        }),

    deleteProject: protectedProcedure
        .input(z.object({ projectId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
            const deleted = await db.delete(projects)
                .where(and(
                    eq(projects.id, input.projectId),
                    eq(projects.userId, ctx.session.user.id)
                ))
                .returning();
            
            if (!deleted[0]) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Project not found or not owned by user" });
            }
            return { success: true };
        }),

    updateProject: protectedProcedure
        .input(z.object({
            projectId: z.string().uuid(),
            title: z.string().min(1).optional(),
            description: z.string().optional(),
            complexityLevel: z.enum(["simple", "moderate", "complex"]).optional()
        }))
        .mutation(async ({ ctx, input }) => {
            const updateData: any = {};
            if (input.title) updateData.title = input.title;
            if (input.description !== undefined) updateData.description = input.description;
            if (input.complexityLevel) {
                let score = 5;
                if (input.complexityLevel === "moderate") score = 15;
                if (input.complexityLevel === "complex") score = 30;
                updateData.complexityScore = score;
            }

            const updated = await db.update(projects)
                .set(updateData)
                .where(and(
                    eq(projects.id, input.projectId),
                    eq(projects.userId, ctx.session.user.id)
                ))
                .returning();
            
            if (!updated[0]) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Project not found or not owned by user" });
            }
            return updated[0];
        }),

    addProjectSkill: protectedProcedure
        .input(z.object({
            projectId: z.string().uuid(),
            skillId: z.string().uuid()
        }))
        .mutation(async ({ ctx, input }) => {
            const project = await db.query.projects.findFirst({
                where: and(
                    eq(projects.id, input.projectId),
                    eq(projects.userId, ctx.session.user.id)
                )
            });

            if (!project) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
            }

            const inserted = await db.insert(projectSkills).values({
                projectId: input.projectId,
                skillId: input.skillId
            }).onConflictDoNothing().returning();

            return { success: true, inserted: inserted.length > 0 };
        }),

    removeProjectSkill: protectedProcedure
        .input(z.object({
            projectId: z.string().uuid(),
            skillId: z.string().uuid()
        }))
        .mutation(async ({ ctx, input }) => {
            const project = await db.query.projects.findFirst({
                where: and(
                    eq(projects.id, input.projectId),
                    eq(projects.userId, ctx.session.user.id)
                )
            });

            if (!project) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
            }

            await db.delete(projectSkills)
                .where(and(
                    eq(projectSkills.projectId, input.projectId),
                    eq(projectSkills.skillId, input.skillId)
                ));

            return { success: true };
        }),

    getProjectSkills: protectedProcedure
        .input(z.object({ projectId: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
            const project = await db.query.projects.findFirst({
                where: and(
                    eq(projects.id, input.projectId),
                    eq(projects.userId, ctx.session.user.id)
                )
            });

            if (!project) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
            }

            return db.query.projectSkills.findMany({
                where: eq(projectSkills.projectId, input.projectId),
                with: { skill: true }
            });
        }),
});

export default githubRouter;
