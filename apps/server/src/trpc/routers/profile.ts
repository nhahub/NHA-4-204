import { z } from "zod";
import { router, publicProcedure } from "../index";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { extractGithubData } from "../../services/githubExtractor";
import { processCV } from "../../services/cvExtractor";

export const profileRouter = router({
    setup: publicProcedure
        .input(z.object({ 
            userId: z.string(), 
            githubUsername: z.string().optional(), 
            base64Cv: z.string().optional() 
        }))
        .mutation(async ({ input }) => {
            let extractedGithubData = null;
            let extractedCvText = null;

            if (input.githubUsername) {
                try {
                    extractedGithubData = await extractGithubData(input.githubUsername);
                } catch (e) {
                    console.error("Failed to extract Github data", e);
                }
            }

            if (input.base64Cv) {
                try {
                    extractedCvText = await processCV(input.base64Cv);
                } catch (e) {
                    console.error("Failed to parse CV", e);
                }
            }

            const inserted = await db.insert(profiles).values({
                userId: input.userId,
                githubUsername: input.githubUsername,
                githubContext: extractedGithubData,
                cvUrl: input.base64Cv ? "in_memory_parsing_complete" : undefined,
                cvText: extractedCvText
            }).onConflictDoUpdate({
                target: profiles.userId,
                set: {
                    githubUsername: input.githubUsername,
                    githubContext: extractedGithubData,
                    cvText: extractedCvText,
                    ...(input.base64Cv && { cvUrl: "in_memory_parsing_complete" }),
                    updatedAt: new Date()
                }
            }).returning();
            
            // Orchestration Step:
            // Send extractedGithubData and extractedCvText to the AI Microservice now.

            return {
                profile: inserted[0],
                githubDataFound: !!extractedGithubData,
                cvParsed: !!extractedCvText
            };
        }),
    get: publicProcedure
        .input(z.object({ userId: z.string() }))
        .query(async ({ input }) => {
            const profile = await db.query.profiles.findFirst({
                where: eq(profiles.userId, input.userId)
            });
            if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
            return profile;
        }),
});
