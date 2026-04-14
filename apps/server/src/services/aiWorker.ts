import OpenAI from "openai";
import { db } from "@/db";
import { profiles, aiJobs, roadmaps, userSkills, skillGapAnalysis } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function processRoadmapJob(jobId: string, userId: string, targetRole: string) {
    if (!process.env.GROQ_API_KEY) {
        console.warn("⚠️ No GROQ_API_KEY found in .env, failing job safely...");
        await db.update(aiJobs).set({ status: "failed", resultPayload: { error: "No API Key" } }).where(eq(aiJobs.id, jobId));
        return;
    }

    try {
        console.log(`🧠 [AI Worker] Processing Job ${jobId} via Groq (Llama-3.3)...`);
        const client = new OpenAI({
            apiKey: process.env.GROQ_API_KEY,
            baseURL: "https://api.groq.com/openai/v1"
        });

        const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });

        const prompt = `
You are an ELITE Senior Technical Career Architect. Your goal is to build a HYPER-PERSONALIZED roadmap for a user transitioning into a new role.

User Context:
CV Extracted Text: ${profile?.cvText || "No CV provided"}
GitHub Data (JSON): ${profile?.githubContext ? JSON.stringify(profile.githubContext) : "No GitHub provided"}
Target Role Seeking: ${targetRole}

INSTRUCTIONS:
1. Deeply analyze the 'GitHub Data' to find their existing STRENGTHS. If they already use a specific language or pattern, do NOT explain the basics of it.
2. Build a "Learning Bridge": Explain how their existing knowledge (e.g., Python/Flask) maps to the new requirements (e.g., React/Node).
3. Objective-Based Milestones: Instead of "Learn HTML", provide tasks like "Build a responsive interface that connects to your existing APIs using Tailwind CSS".
4. Pick ONE modern industry-standard stack (e.g., Next.js, Tailwind, TypeScript) rather than a generic list of frameworks.

You must output a JSON object obeying the exact following schema:
{
  "skills": ["TypeScript", "React", "NodeJS"], 
  "missing_skills": ["Docker", "Kubernetes", "GraphQL"],
  "readiness_score": 60,
  "roadmap": {
    "title": "Mastering the ${targetRole} Stack",
    "modules": [
       { "id": "uuid-v4-string", "title": "Advanced API Integration", "tasks": ["Bridge your Python backend with a React frontend", "Implement JWT auth"] }
    ]
  }
}
Do NOT wrap the output in markdown codeblocks. Return pure JSON.
`;

        let responseText = "";
        for (let i = 0; i < 3; i++) {
            try {
                const completion = await client.chat.completions.create({
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "user", content: prompt }],
                    response_format: { type: "json_object" }
                });
                responseText = completion.choices?.[0]?.message?.content || "";
                break;
            } catch (err: any) {
                if (err.status === 429 && i < 2) {
                    console.log(`[AI Worker] Groq 429 Rate Limit, retrying in 5s...`);
                    await new Promise(r => setTimeout(r, 5000));
                } else {
                    throw err;
                }
            }
        }
        
        if (!responseText) throw new Error("Failed to get response from Groq after retries.");

        let result;
        try {
            result = JSON.parse(responseText || "{}");
        } catch(e) {
            result = { skills: [], missing_skills: [], readiness_score: 0, roadmap: {} };
        }

        // 1. Insert/Update User Skills
        await db.insert(userSkills).values({
            userId: userId,
            skills: result.skills || [],
        }).onConflictDoUpdate({
            target: userSkills.userId,
            set: { skills: result.skills || [], lastUpdated: new Date() }
        });

        // 2. Insert Skill Gap Analysis
        await db.insert(skillGapAnalysis).values({
            id: crypto.randomUUID(),
            userId: userId,
            role: targetRole,
            missingSkills: result.missing_skills || [],
            readinessScore: result.readiness_score || 0
        });

        // 3. Insert Roadmaps
        const roadmapId = crypto.randomUUID();
        await db.insert(roadmaps).values({
            id: roadmapId,
            userId: userId,
            role: targetRole,
            roadmapJson: result.roadmap || {}
        });

        // 4. Conclude Job
        await db.update(aiJobs)
            .set({ status: "completed", resultPayload: { roadmapId, readinessScore: result.readiness_score, status: "Successfully analyzed via Groq Llama-3.3!" } })
            .where(eq(aiJobs.id, jobId));
        
        console.log(`✅ [AI Worker] Job ${jobId} Completed! Data written into Db.`);

    } catch (e: any) {
        console.error("❌ [AI Worker] Groq API failed, falling back to smart mock data:", e.message);
        
        // SMART FALLBACK LOGIC
        const fallback = getFallbackData(targetRole);
        
        await db.insert(userSkills).values({
            userId: userId,
            skills: fallback.skills,
        }).onConflictDoUpdate({
            target: userSkills.userId,
            set: { skills: fallback.skills, lastUpdated: new Date() }
        });

        await db.insert(skillGapAnalysis).values({
            id: crypto.randomUUID(),
            userId: userId,
            role: targetRole,
            missingSkills: fallback.missing_skills,
            readinessScore: fallback.readiness_score
        });

        const roadmapId = crypto.randomUUID();
        await db.insert(roadmaps).values({
            id: roadmapId,
            userId: userId,
            role: targetRole,
            roadmapJson: fallback.roadmap
        });

        await db.update(aiJobs).set({ 
            status: "completed", 
            resultPayload: { 
                roadmapId, 
                warning: "Generated using fallback mock data due to API availability issues.",
                errorDetails: e.message 
            } 
        }).where(eq(aiJobs.id, jobId));
        
        console.log(`✅ [AI Worker] Job ${jobId} Completed via Fallback!`);
    }
}

function getFallbackData(role: string) {
    const isFrontend = role.toLowerCase().includes("front");
    const isBackend = role.toLowerCase().includes("back");
    
    if (isFrontend) {
        return {
            skills: ["HTML5", "CSS3", "JavaScript"],
            missing_skills: ["TypeScript", "React", "Next.js", "Tailwind CSS"],
            readiness_score: 45,
            roadmap: {
                title: `Modern Frontend Mastery: ${role}`,
                modules: [
                    { id: "mod-1", title: "TypeScript Fundamentals", tasks: ["Interfaces vs Types", "Generics", "Strict Mode Configuration"] },
                    { id: "mod-2", title: "React Deep Dive", tasks: ["Hook Patterns", "Context API", "Server Components"] }
                ]
            }
        };
    }
    
    if (isBackend) {
        return {
            skills: ["Node.js", "Express", "SQL"],
            missing_skills: ["PostgreSQL", "Prisma/Drizzle", "Redis", "Docker"],
            readiness_score: 50,
            roadmap: {
                title: `Scalable Systems Roadmap: ${role}`,
                modules: [
                    { id: "mod-1", title: "Database Architecture", tasks: ["Normalization", "Indexing Strategies", "Migration Workflows"] },
                    { id: "mod-2", title: "DevOps Basics", tasks: ["Dockerfile construction", "CI/CD Pipelines"] }
                ]
            }
        };
    }

    return {
        skills: ["Problem Solving", "Basic Programming"],
        missing_skills: ["System Design", "Cloud Architecture", "Unit Testing"],
        readiness_score: 30,
        roadmap: {
            title: `Professional Developer Path: ${role}`,
            modules: [
                { id: "mod-1", title: "Core Engineering", tasks: ["Data Structures", "Algorithms", "Clean Code"] },
                { id: "mod-2", title: "Industry Standards", tasks: ["Git Workflow", "Agile Methodologies"] }
            ]
        }
    };
}
