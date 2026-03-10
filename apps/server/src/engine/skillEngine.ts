import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
    projects,
    projectSkills,
    githubStats,
    skills,
    userSkills,
    user,
} from "@/db/schema";
import {
    aggregateContributions,
    calculateContributionComplexity,
    mergeGraphqlContributionStats,
    contributionPoints,
    type ContributionRepo,
} from "@/engine/github/contributionAggregator";
import {
    fetchGithubEvents,
    fetchGithubRepos,
    fetchRepoDependencies,
    fetchRepoLanguageBreakdowns,
} from "@/engine/github/githubClient";
import { fetchGithubContributionStats } from "@/engine/github/githubGraphqlClient.js";
import {
    calculateCategorizedLanguageStrengths,
    extractRepoSkillNames,
    getSkillCategory,
    selectRepoNamesForLanguageAnalysis,
} from "@/engine/github/languageAnalyzer";
import {
    calculateDependencySkills,
    calculateInferredSkillStrengths,
} from "@/engine/github/skillInference";
import { calculateActivityScore } from "@/engine/github/activityScore";
import {
    clamp,
    getGithubHeaders,
    normalizeSkillName,
    type GitHubRepo,
} from "@/engine/github/utils";

export async function buildUserSkillMap({
    githubUsername,
}: {
    userId: string;
    githubUsername: string;
}) {
    const headers = getGithubHeaders();

    const graphqlStats = await fetchGithubContributionStats({
        username: githubUsername,
        headers,
    });

    if (process.env.GITHUB_DEBUG_GRAPHQL === "1") {
        console.log("GraphQL contribution stats:", graphqlStats);
    }

    const events = await fetchGithubEvents({ username: githubUsername, headers });
    const repos = await fetchGithubRepos({ username: githubUsername, headers });

    const eventContributions = aggregateContributions(events);

    const contributions = graphqlStats
        ? mergeGraphqlContributionStats({
            baseContributions: eventContributions,
            stats: graphqlStats,
        })
        : eventContributions;

    const repoNames = selectRepoNamesForLanguageAnalysis({
        repos,
        contributions,
    });

    const repoLanguages = await fetchRepoLanguageBreakdowns({
        repoNames,
        headers,
    });

    const { combinedSkillStrengths: categorizedSkillStrengths } =
        calculateCategorizedLanguageStrengths({
            contributions,
            repoLanguages,
            repos,
        });

    const dependencyRepoNames = selectTopRepoNamesForDependencyAnalysis({
        repos,
        contributions,
        maxRepos: 10,
    });

    const repoDependencies = await fetchRepoDependencies({
        repoNames: dependencyRepoNames,
        headers,
    });

    const dependencySkills = calculateDependencySkills({
        repoDependencies,
    });

    if (process.env.GITHUB_DEBUG_GRAPHQL === "1") {
        console.log("Detected repo dependencies:", repoDependencies);
        console.log("Derived dependency skills:", dependencySkills);
    }

    const inferredSkillStrengths = calculateInferredSkillStrengths({
        contributions,
        events,
        repoLanguages,
        repos,
        repoDependencies,
    });

    const combinedSkillStrengths = new Map(categorizedSkillStrengths);

    for (const [skill, strength] of inferredSkillStrengths) {
        combinedSkillStrengths.set(
            skill,
            Math.max(combinedSkillStrengths.get(skill) ?? 0, strength)
        );
    }

    if (process.env.GITHUB_DEBUG_GRAPHQL === "1") {
        const categorizedSkills = categorizeSkills(combinedSkillStrengths);

        console.log("Final skill categories:", categorizedSkills);
    }

    const activityScore = calculateActivityScore({
        contributions,
        events,
        repos,
    });

    return {
        headers,
        graphqlStats,
        events,
        repos,
        contributions,
        repoLanguages,
        repoDependencies,
        dependencySkills,
        inferredSkillStrengths,
        combinedSkillStrengths,
        activityScore,
    };
}

export async function syncGithubSkillsForUser({
    userId,
    githubUsername,
}: {
    userId: string;
    githubUsername: string;
}) {
    const existingUser = await db.query.user.findFirst({
        where: eq(user.id, userId),
    });

    if (!existingUser) {
        throw new TRPCError({
            code: "BAD_REQUEST",
            message: `User ${userId} not found.`,
        });
    }

    const skillMapData = await buildUserSkillMap({
        userId,
        githubUsername,
    });

    const {
        repos,
        contributions,
        repoLanguages,
        combinedSkillStrengths,
        activityScore,
    } = skillMapData;

    const allSkills = await db.select().from(skills);

    let skillsByNormalizedName = new Map<
        string,
        Array<(typeof allSkills)[number]>
    >();

    for (const skill of allSkills) {
        const key = normalizeSkillName(skill.name);
        const bucket = skillsByNormalizedName.get(key) ?? [];
        bucket.push(skill);
        skillsByNormalizedName.set(key, bucket);
    }

    const normalizedInferredSkillNames = new Set(
        [...combinedSkillStrengths.keys()].map((skill) => normalizeSkillName(skill))
    );

    const missingNormalizedSkillNames = [...normalizedInferredSkillNames].filter(
        (normalizedName) => !skillsByNormalizedName.has(normalizedName)
    );

    if (missingNormalizedSkillNames.length > 0) {
        await db
            .insert(skills)
            .values(
                missingNormalizedSkillNames.map((name) => ({
                    name,
                    hasNoDependencies: true,
                }))
            )
            .onConflictDoNothing();

        const refreshedSkills = await db.select().from(skills);
        skillsByNormalizedName = new Map();

        for (const skill of refreshedSkills) {
            const key = normalizeSkillName(skill.name);
            const bucket = skillsByNormalizedName.get(key) ?? [];
            bucket.push(skill);
            skillsByNormalizedName.set(key, bucket);
        }
    }

    for (const contribution of contributions.values()) {
        const complexityScore = calculateContributionComplexity(contribution);

        const [project] = await db
            .insert(projects)
            .values({
                userId,
                title: contribution.repoName,
                description: "",
                source: "github",
                complexityScore,
            })
            .onConflictDoUpdate({
                target: [projects.userId, projects.title],
                set: { complexityScore },
            })
            .returning();

        if (!project) continue;

        const repoSkillNames = extractRepoSkillNames(
            repoLanguages.get(contribution.repoName)
        );

        for (const name of repoSkillNames) {
            const normalized = normalizeSkillName(name);
            const matchedSkills = skillsByNormalizedName.get(normalized) ?? [];

            for (const skill of matchedSkills) {
                await db
                    .insert(projectSkills)
                    .values({
                        projectId: project.id,
                        skillId: skill.id,
                    })
                    .onConflictDoNothing();
            }
        }
    }

    for (const [skillName, strength] of combinedSkillStrengths) {
        const normalized = normalizeSkillName(skillName);
        const matchedSkills = skillsByNormalizedName.get(normalized) ?? [];

        for (const skill of matchedSkills) {
            const githubStrength = Number(strength.toFixed(2));

            const existingUserSkill = await db.query.userSkills.findFirst({
                where: and(
                    eq(userSkills.userId, userId),
                    eq(userSkills.skillId, skill.id)
                ),
            });

            const existingStrength = existingUserSkill
                ? Number(existingUserSkill.strengthScore)
                : 0;

            const mergedStrength = Math.max(existingStrength, githubStrength);

            await db
                .insert(userSkills)
                .values({
                    userId,
                    skillId: skill.id,
                    strengthScore: mergedStrength.toFixed(2),
                })
                .onConflictDoUpdate({
                    target: [userSkills.userId, userSkills.skillId],
                    set: { strengthScore: mergedStrength.toFixed(2) },
                });
        }
    }

    const totalStars = repos.reduce(
        (sum, repo) => sum + (repo.stargazers_count ?? 0),
        0
    );

    const reposCount = Math.max(repos.length, contributions.size);

    await db
        .insert(githubStats)
        .values({
            userId,
            username: githubUsername,
            reposCount,
            totalStars,
            activityScore: activityScore.toString(),
        })
        .onConflictDoUpdate({
            target: githubStats.userId,
            set: {
                reposCount,
                totalStars,
                activityScore: activityScore.toString(),
            },
        });

    return {
        repoCount: reposCount,
        activityScore,
    };
}

function selectTopRepoNamesForDependencyAnalysis({
    repos,
    contributions,
    maxRepos,
}: {
    repos: GitHubRepo[];
    contributions: Map<string, ContributionRepo>;
    maxRepos: number;
}) {
    const now = Date.now();

    const scoredRepos = repos.map((repo) => {
        const contribution = contributions.get(repo.full_name);
        const contributionScore = contribution
            ? Math.log1p(contributionPoints(contribution)) * 18
            : 0;

        const lastPushedAt = Date.parse(
            repo.pushed_at ?? contribution?.lastActivityAt ?? ""
        );
        const recencyScore = Number.isFinite(lastPushedAt)
            ? clamp(30 - (now - lastPushedAt) / 86400000, 0, 30)
            : 0;

        return {
            repoName: repo.full_name,
            score: contributionScore + recencyScore,
        };
    });

    return scoredRepos
        .sort((left, right) => right.score - left.score)
        .slice(0, Math.max(0, maxRepos))
        .map((entry) => entry.repoName);
}

function categorizeSkills(skillMap: Map<string, number>) {
    const categorized = {
        languages: new Map<string, number>(),
        databases: new Map<string, number>(),
        frameworks: new Map<string, number>(),
        devops: new Map<string, number>(),
    };

    for (const [skillName, strength] of skillMap) {
        const normalizedSkill = normalizeSkillName(skillName);
        const category = getSkillCategory(normalizedSkill);

        if (!category) continue;

        categorized[category].set(normalizedSkill, strength);
    }

    return categorized;
}
