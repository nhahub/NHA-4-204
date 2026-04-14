import { z } from "zod";
import { router, publicProcedure } from "../index";
import { db } from "@/db";
import { aiJobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const aiRouter = router({
    startJob: publicProcedure
        .input(z.object({ userId: z.string(), type: z.string(), payload: z.any() }))
        .mutation(async ({ input }) => {
            const jobId = crypto.randomUUID();
            const job = await db.insert(aiJobs).values({
                id: jobId,
                userId: input.userId,
                type: input.type,
                status: "pending",
                inputPayload: input.payload
            }).returning();

            // Fire and forget fetch to AI Microservice - Substitued with Background Gemini Processor
            import("@/services/aiWorker").then(mod => {
                mod.processRoadmapJob(jobId, input.userId, input.payload?.targetRole || "Software Engineer").catch(e => console.error("Worker exception:", e));
            });

            const createdJob = job[0];
            if (!createdJob) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to create AI job",
                });
            }

            return { jobId: createdJob.id };
        }),
    getJob: publicProcedure
        .input(z.object({ jobId: z.string() }))
        .query(async ({ input }) => {
            const job = await db.query.aiJobs.findFirst({
                where: eq(aiJobs.id, input.jobId)
            });
            if (!job) throw new TRPCError({ code: "NOT_FOUND" });
            return job;
        }),
    listJobs: publicProcedure
        .input(z.object({ userId: z.string() }))
        .query(async ({ input }) => {
            return await db.query.aiJobs.findMany({
                where: eq(aiJobs.userId, input.userId)
            });
        }),
});
