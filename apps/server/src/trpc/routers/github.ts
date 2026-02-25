import { z } from "zod";
import { router, publicProcedure } from "../index";
import { db } from "@/db";
import {
    projects,
    projectSkills,
    githubStats,
    skills,
    userSkills,
    user,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

type GitHubRepo = {
    name: string;
    description: string | null;
    language: string | null;
    stargazers_count: number;
    forks_count: number;
    size: number;
};

export const githubRouter = router({
    sync: publicProcedure
        .input(
            z.object({
                userId: z.string(),
                username: z.string(),
            })
        )
        .mutation(async ({ input }) => {
            const { userId, username } = input;

            const existingUser = await db.query.user.findFirst({
                where: eq(user.id, userId),
            });

            if (!existingUser) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: `User ${userId} not found. Use a valid existing userId.`,
                });
            }

            const headers: Record<string, string> = {};
            if (process.env.GITHUB_TOKEN) {
                headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
            }

            const response = await fetch(
                `https://api.github.com/users/${username}/repos?per_page=100`,
                {
                    headers,
                    signal: AbortSignal.timeout(15_000),
                }
            );

            if (!response.ok) {
                const githubErrorMessage = await getGithubErrorMessage(response);

                if (response.status === 404) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: `GitHub user \"${username}\" was not found.`,
                    });
                }

                if (isGithubRateLimit(response)) {
                    const reset = response.headers.get("x-ratelimit-reset");
                    const resetAt =
                        reset && !Number.isNaN(Number(reset))
                            ? new Date(Number(reset) * 1000).toISOString()
                            : null;

                    throw new TRPCError({
                        code: "TOO_MANY_REQUESTS",
                        message: resetAt
                            ? `GitHub API rate limit exceeded. Try again after ${resetAt}.`
                            : "GitHub API rate limit exceeded. Try again later.",
                    });
                }

                throw new TRPCError({
                    code: "BAD_GATEWAY",
                    message: `GitHub API request failed (${response.status}): ${githubErrorMessage}`,
                });
            }

            const repos = (await response.json()) as GitHubRepo[];

            for (const repo of repos) {
                const complexityScore = calculateComplexity(repo);
                const [project] = await db
                    .insert(projects)
                    .values({
                        userId,
                        title: repo.name,
                        description: repo.description ?? "",
                        source: "github",
                        complexityScore,
                    }).onConflictDoUpdate({
                        target: [projects.userId, projects.title],
                        set: { complexityScore },
                    })
                    .returning();

                if (!project) continue;

                if (repo.language) {
                    const skill = await db.query.skills.findFirst({
                        where: eq(skills.name, repo.language),
                    });

                    if (skill) {
                        await db
                            .insert(projectSkills)
                            .values({
                                projectId: project.id,
                                skillId: skill.id,
                            })
                            .onConflictDoNothing();

                        const strengthScore = "40";

                        await db
                            .insert(userSkills)
                            .values({
                                userId,
                                skillId: skill.id,
                                strengthScore,
                            })
                            .onConflictDoUpdate({
                                target: [userSkills.userId, userSkills.skillId],
                                set: { strengthScore },
                            });
                    }
                }
            }

            const activityScore = calculateActivityScore(repos);
            const activityScoreValue = activityScore.toString();
            const totalStars = repos.reduce(
                (sum, r) => sum + r.stargazers_count,
                0
            );

            await db
                .insert(githubStats)
                .values({
                    userId,
                    username,
                    reposCount: repos.length,
                    totalStars,
                    activityScore: activityScoreValue,
                })
                .onConflictDoUpdate({
                    target: githubStats.userId,
                    set: {
                        reposCount: repos.length,
                        totalStars,
                        activityScore: activityScoreValue,
                    },
                });

            return {
                repoCount: repos.length,
                activityScore,
            };
        }),
});

function calculateComplexity(repo: GitHubRepo) {
    return Math.min(
        100,
        repo.stargazers_count * 5 +
        repo.forks_count * 3 +
        repo.size / 10
    );
}

function calculateActivityScore(repos: GitHubRepo[]) {
    if (repos.length === 0) return 0;

    let score = repos.length * 5;

    const uniqueLanguages = new Set(
        repos.map((r) => r.language).filter(Boolean)
    );

    score += uniqueLanguages.size * 10;

    return Math.min(100, score);
}

function isGithubRateLimit(response: Response) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    return response.status === 429 || (response.status === 403 && remaining === "0");
}

async function getGithubErrorMessage(response: Response) {
    try {
        const body = (await response.json()) as { message?: unknown };
        if (typeof body.message === "string" && body.message.trim().length > 0) {
            return body.message;
        }
    } catch {
        // Ignore parsing failures and fallback to status text below.
    }

    return response.statusText || "Unknown GitHub error";
}