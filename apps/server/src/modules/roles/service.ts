import { TRPCError } from "@trpc/server";
import { eq, inArray ,sql} from "drizzle-orm";

import { db } from "@/db";
import {
    roleSkills,
    userSkills,
    projects,
    projectSkills,
    githubStats,
    readinessReports,
    skillGapResults,
    skills,
    roles,
} from "@/db/schema";

const WEAK_SKILL_THRESHOLD = 35;
const BONUS_IMPORTANCE_THRESHOLD = 2;
const BONUS_SCORE_CAP = 10;
const FINAL_SCORE_WEIGHTS = {
    skills: 0.6,
    projects: 0.25,
    github: 0.15,
} as const;

const ROLE_GITHUB_WEIGHTS = {
    general: 0.5,
    skillAlignment: 0.3,
    projectAlignment: 0.2,
} as const;

export async function evaluateUserForRole({
    userId,
    roleId,
}: {
    userId: string;
    roleId: string;
}) {
    const role = await db.query.roles.findFirst({
        where: eq(roles.id, roleId),
    });

    if (!role) {
        throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Role \"${roleId}\" not found.`,
        });
    }

    return evaluateUserForRoleInternal({ userId, roleId: role.id });
}

export async function evaluateUserForRoleName({
    userId,
    roleName,
}: {
    userId: string;
    roleName: string;
}) {
    const normalizedRoleName = roleName.toLowerCase().replace(/\s+/g, "");

    const role = await db.query.roles.findFirst({
    where: sql`
        replace(lower(${roles.title}), ' ', '') =
        ${normalizedRoleName}
    `,
    });

    if (!role) {
        throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Role \"${roleName}\" not found.`,
        });
    }

    return evaluateUserForRoleInternal({ userId, roleId: role.id });
}

async function evaluateUserForRoleInternal({
        userId,
        roleId,
    }: {
        userId: string;
        roleId: string;
    }) {
        const requiredSkills = await db
        .select()
        .from(roleSkills)
        .where(eq(roleSkills.roleId, roleId));

    const userSkillList = await db
        .select()
        .from(userSkills)
        .where(eq(userSkills.userId, userId));
    const userSkillById = new Map(userSkillList.map((entry) => [entry.skillId, entry]));

    const requiredSkillIds = requiredSkills.map((req) => req.skillId);
    const requiredSkillMetadata =
        requiredSkillIds.length === 0
            ? []
            : await db.select().from(skills).where(inArray(skills.id, requiredSkillIds));

    const skillById = new Map(requiredSkillMetadata.map((skill) => [skill.id, skill]));

    const requiredSkillsWithImportance = requiredSkills.map((req) => ({
        ...req,
        importance: getSkillImportance(req),
    }));

    const coreRoleSkills = requiredSkillsWithImportance.filter(
        (req) => req.importance > BONUS_IMPORTANCE_THRESHOLD
    );
    const bonusRoleSkills = requiredSkillsWithImportance.filter(
        (req) => req.importance <= BONUS_IMPORTANCE_THRESHOLD
    );

    let totalCoreWeight = 0;
    let weightedCoreStrength = 0;
    let totalBonusWeight = 0;
    let weightedBonusStrength = 0;

    const missingSkills: string[] = [];
    const weakSkills: string[] = [];
    const bonusSkillsDetected: string[] = [];
    
    let hasMissingCoreSkill = false;

    for (const req of coreRoleSkills) {
        totalCoreWeight += req.importance;

        const match = userSkillById.get(req.skillId);

        const skillInfo = skillById.get(req.skillId);

        if (!match) {
            hasMissingCoreSkill = true;
            if (skillInfo) {
                missingSkills.push(skillInfo.name);
            }
            continue;
        }

        const strength = clamp(Number(match.strengthScore), 0, 100);
        
        if (strength === 0) {
            hasMissingCoreSkill = true;
        }

        weightedCoreStrength += strength * req.importance;

        if (strength < WEAK_SKILL_THRESHOLD) {
            if (skillInfo) {
                weakSkills.push(skillInfo.name);
            }
        }
    }

    for (const req of bonusRoleSkills) {
        totalBonusWeight += req.importance;

        const match = userSkillById.get(req.skillId);
        if (!match) {
            continue;
        }

        const skillInfo = skillById.get(req.skillId);
        if (skillInfo) {
            bonusSkillsDetected.push(skillInfo.name);
        }

        const strength = clamp(Number(match.strengthScore), 0, 100);
        weightedBonusStrength += strength * req.importance;
    }


    const skillMatchScore =
        totalCoreWeight === 0 ? 0 : weightedCoreStrength / totalCoreWeight;

    const rawBonusScore =
        totalBonusWeight === 0
            ? 0
            : weightedBonusStrength / (totalBonusWeight * 100);
    const bonusScore = clamp(rawBonusScore * BONUS_SCORE_CAP, 0, BONUS_SCORE_CAP);

    const userProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, userId));

    const projectScore = calculateProjectScore(userProjects);

    const github = await db.query.githubStats.findFirst({
        where: eq(githubStats.userId, userId),
    });

    const generalGithubScore = calculateGeneralGithubScore(github);

    const projectIds = userProjects.map((project) => project.id);
    const roleProjectSkills =
        projectIds.length === 0 || requiredSkillIds.length === 0
            ? []
            : await db
                .select()
                .from(projectSkills)
                .where(inArray(projectSkills.projectId, projectIds));

    const roleGithubScore = calculateRoleGithubScore({
        generalGithubScore,
        requiredSkills: coreRoleSkills,
        userSkillById,
        userProjects,
        roleProjectSkills,
    });

    const totalScore =
        skillMatchScore * FINAL_SCORE_WEIGHTS.skills +
        projectScore * FINAL_SCORE_WEIGHTS.projects +
        roleGithubScore * FINAL_SCORE_WEIGHTS.github;
        
    let finalScore = clamp(totalScore + bonusScore, 0, 100);

    if (hasMissingCoreSkill) {
        finalScore = clamp(finalScore, 0, 49);
    }

    const insertedReports = await db
        .insert(readinessReports)
        .values({
            userId,
            roleId,
            skillMatchScore: skillMatchScore.toString(),
            generalGithubScore: generalGithubScore.toString(),
            overallReadinessScore: finalScore.toString(),
            feedback: "Calculated automatically.",
        })
        .returning();

    const report = insertedReports.at(0);

    if (!report) {
        throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create readiness report",
        });
    }

    await db.insert(skillGapResults).values({
        userId,
        roleId,
        missingSkills: JSON.stringify({ missing: missingSkills, weak: weakSkills }),
        matchScore: skillMatchScore.toString(),
    });

    return {
        skillMatchScore,
        projectScore,
        generalGithubScore,
        roleGithubScore,
        bonusScore,
        totalScore,
        finalScore,
        missingSkills,
        weakSkills,
        bonusSkillsDetected,
    };
}

function calculateProjectScore(userProjects: Array<{ complexityScore: number }>) {
    if (userProjects.length === 0) {
        return 0;
    }

    const complexities = userProjects
        .map((project) => clamp(Number(project.complexityScore), 0, 100))
        .sort((a, b) => b - a);

    const topCountForAvg = Math.min(5, complexities.length);
    const averageComplexity =
        complexities.slice(0, topCountForAvg).reduce((sum, value) => sum + value, 0) / topCountForAvg;

    const topCount = Math.min(3, complexities.length);
    const topAverage =
        complexities.slice(0, topCount).reduce((sum, value) => sum + value, 0) /
        topCount;

    const portfolioBreadth = clamp(Math.log1p(userProjects.length) * 16, 0, 20);

    return clamp(
        averageComplexity * 0.65 + topAverage * 0.2 + portfolioBreadth * 0.75,
        0,
        100
    );
}

function calculateGeneralGithubScore(
    github:
        | {
            activityScore: string;
            reposCount: number;
            totalStars: number;
        }
        | undefined
) {
    if (!github) {
        return 0;
    }

    const activity = clamp(Number(github.activityScore), 0, 100);
    const repoBreadth = clamp(Math.log1p(github.reposCount) * 12, 0, 22);
    const impact = clamp(Math.log1p(github.totalStars) * 10, 0, 24);

    return clamp(activity * 0.6 + repoBreadth + impact, 0, 100);
}

function calculateRoleGithubScore({
    generalGithubScore,
    requiredSkills,
    userSkillById,
    userProjects,
    roleProjectSkills,
}: {
    generalGithubScore: number;
    requiredSkills: Array<{ skillId: string; importance: number }>;
    userSkillById: Map<string, { userId: string; skillId: string; strengthScore: string }>;
    userProjects: Array<{ id: string; complexityScore: number }>;
    roleProjectSkills: Array<{ projectId: string; skillId: string }>;
}) {
    if (requiredSkills.length === 0) {
        return generalGithubScore;
    }

    const totalWeight = requiredSkills.reduce(
        (sum, skill) => sum + skill.importance,
        0
    );

    if (totalWeight <= 0) {
        return generalGithubScore;
    }

    const skillAlignmentWeighted = requiredSkills.reduce((sum, skill) => {
        const strength = clamp(
            Number(userSkillById.get(skill.skillId)?.strengthScore ?? 0),
            0,
            100
        );

        return sum + skill.importance * (strength / 100);
    }, 0);

    const roleSkillAlignmentScore = clamp(
        (skillAlignmentWeighted / totalWeight) * 100,
        0,
        100
    );

    const projectCount = userProjects.length;
    const roleProjectSkillSet = new Set(
        roleProjectSkills.map((entry) => `${entry.projectId}:${entry.skillId}`)
    );

    const projectAlignmentWeighted = requiredSkills.reduce((sum, skill) => {
        if (projectCount === 0) {
            return sum;
        }

        let projectsWithSkill = 0;
        for (const project of userProjects) {
            if (roleProjectSkillSet.has(`${project.id}:${skill.skillId}`)) {
                projectsWithSkill += 1;
            }
        }

        const coverage = clamp(projectsWithSkill / Math.min(projectCount, 3), 0, 1);
        return sum + skill.importance * coverage;
    }, 0);

    const roleProjectAlignmentScore = clamp(
        (projectAlignmentWeighted / totalWeight) * 100,
        0,
        100
    );

    return clamp(
        generalGithubScore * ROLE_GITHUB_WEIGHTS.general +
        roleSkillAlignmentScore * ROLE_GITHUB_WEIGHTS.skillAlignment +
        roleProjectAlignmentScore * ROLE_GITHUB_WEIGHTS.projectAlignment,
        0,
        100
    );
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function getSkillImportance(skill: { isCore: boolean } & Record<string, unknown>) {
    return skill.isCore ? 5 : 1;
}
