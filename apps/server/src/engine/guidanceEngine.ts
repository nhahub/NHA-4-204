import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
    roles,
    roleSkills,
    userSkills,
    readinessReports,
    skillGapResults,
    roadmaps,
    roadmapSteps,
    skills,
    skillDependencies,
} from "@/db/schema";

export async function generateLearningRoadmap({
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

    return generateLearningRoadmapInternal({ userId, roleId: role.id });
}

export async function generateLearningRoadmapByRoleName({
    userId,
    roleName,
}: {
    userId: string;
    roleName: string;
}) {
    const role = await db.query.roles.findFirst({
        where: eq(roles.name, roleName),
    });

    if (!role) {
        throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Role \"${roleName}\" not found.`,
        });
    }

    return generateLearningRoadmapInternal({ userId, roleId: role.id });
}

export async function completeRoadmapStep({
    userId,
    stepId,
}: {
    userId: string;
    stepId: string;
}) {
    const matchingStep = await db
        .select({
            stepId: roadmapSteps.id,
            roadmapId: roadmapSteps.roadmapId,
            skillId: roadmapSteps.skillId,
            status: roadmapSteps.status,
            roadmapUserId: roadmaps.userId,
        })
        .from(roadmapSteps)
        .innerJoin(roadmaps, eq(roadmaps.id, roadmapSteps.roadmapId))
        .where(
            and(
                eq(roadmapSteps.id, stepId),
                eq(roadmaps.userId, userId)
            )
        )
        .limit(1);

    const step = matchingStep[0];

    if (!step) {
        throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Roadmap step not found for this user",
        });
    }

    await db
        .update(roadmapSteps)
        .set({ status: "completed" })
        .where(eq(roadmapSteps.id, step.stepId));

    let skill = await db.query.skills.findFirst({
        where: eq(skills.id, step.skillId),
    });

    if (!skill) {
        await db
            .insert(skills)
            .values({
                id: step.skillId,
                name: `generated-skill-${step.skillId}`,
                hasNoDependencies: true,
            })
            .onConflictDoNothing();

        skill = await db.query.skills.findFirst({
            where: eq(skills.id, step.skillId),
        });

        if (!skill) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to resolve step skill",
            });
        }
    }

    const currentUserSkill = await db.query.userSkills.findFirst({
        where: and(
            eq(userSkills.userId, userId),
            eq(userSkills.skillId, step.skillId)
        ),
    });

    const currentStrength = currentUserSkill
        ? clamp(Number(currentUserSkill.strengthScore), 0, 100)
        : 0;

    const newStrength = currentUserSkill
        ? Math.min(currentStrength + 15, 100)
        : 15;

    await db
        .insert(userSkills)
        .values({
            userId,
            skillId: step.skillId,
            strengthScore: newStrength.toString(),
        })
        .onConflictDoUpdate({
            target: [userSkills.userId, userSkills.skillId],
            set: {
                strengthScore: newStrength.toString(),
            },
        });

    return {
        stepId: step.stepId,
        status: "completed" as const,
        skillId: step.skillId,
        skillName: skill.name,
        previousStrength: currentStrength,
        newStrength,
    };
}

async function generateLearningRoadmapInternal({
    userId,
    roleId,
}: {
    userId: string;
    roleId: string;
}) {
    const latestReport = await db.query.readinessReports.findFirst({
        where: eq(readinessReports.userId, userId),
        orderBy: desc(readinessReports.createdAt),
    });

    if (!latestReport || latestReport.roleId !== roleId) {
        throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No readiness report found for this role.",
        });
    }

    await db
        .delete(roadmaps)
        .where(eq(roadmaps.readinessReportId, latestReport.id));

    const gaps = await db
        .select()
        .from(skillGapResults)
        .where(eq(skillGapResults.reportId, latestReport.id));

    if (gaps.length === 0) {
        return { message: "No skill gaps found. You're ready." };
    }

    const gapSkillIds = gaps.map((g) => g.skillId);

    const roleSkillWeights = await db
        .select()
        .from(roleSkills)
        .where(eq(roleSkills.roleId, roleId));

    const userSkillRows = await db
        .select()
        .from(userSkills)
        .where(eq(userSkills.userId, userId));

    const userStrengthBySkillId = new Map(
        userSkillRows.map((row) => [row.skillId, clamp(Number(row.strengthScore), 0, 100)])
    );

    const roleWeightBySkillId = new Map(
        roleSkillWeights.map((row) => [row.skillId, getRoleSkillWeight(row)])
    );

    const skillList = await db
        .select()
        .from(skills)
        .where(inArray(skills.id, gapSkillIds));

    const skillById = new Map(skillList.map((item) => [item.id, item]));

    const dependencies = await db
        .select()
        .from(skillDependencies)
        .where(inArray(skillDependencies.skillId, gapSkillIds));

    const roadmapMap = new Map<
        string,
        {
            skillId: string;
            skillName: string;
            weight: number;
            priorityScore: number;
            priority: "high" | "medium";
        }
    >();

    for (const gap of gaps) {
        const weight = roleWeightBySkillId.get(gap.skillId) ?? 0;
        const strength = userStrengthBySkillId.get(gap.skillId) ?? 0;
        const priorityScore = weight * (100 - strength);
        const skill = skillById.get(gap.skillId);

        roadmapMap.set(gap.skillId, {
            skillId: gap.skillId,
            skillName: skill?.name ?? "Unknown",
            weight,
            priorityScore,
            priority: gap.gapType === "missing" ? "high" : "medium",
        });
    }

    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const id of roadmapMap.keys()) {
        graph.set(id, []);
        inDegree.set(id, 0);
    }

    for (const dep of dependencies) {
        if (!roadmapMap.has(dep.dependsOnSkillId)) continue;

        graph.get(dep.dependsOnSkillId)?.push(dep.skillId);
        inDegree.set(dep.skillId, (inDegree.get(dep.skillId) ?? 0) + 1);
    }

    const queue: string[] = [];

    for (const [id, degree] of inDegree.entries()) {
        if (degree === 0) {
            queue.push(id);
        }
    }

    const sorted: string[] = [];

    while (queue.length > 0) {
        queue.sort((a, b) => {
            const A = roadmapMap.get(a)!;
            const B = roadmapMap.get(b)!;

            const pDiff = B.priorityScore - A.priorityScore;

            if (pDiff !== 0) return pDiff;

            return B.weight - A.weight;
        });

        const current = queue.shift()!;
        sorted.push(current);

        for (const neighbor of graph.get(current) ?? []) {
            inDegree.set(neighbor, (inDegree.get(neighbor) ?? 0) - 1);

            if (inDegree.get(neighbor) === 0) {
                queue.push(neighbor);
            }
        }
    }

    if (sorted.length !== roadmapMap.size) {
        throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Dependency cycle detected in roadmap generation.",
        });
    }

    const inserted = await db
        .insert(roadmaps)
        .values({
            userId,
            roleId,
            readinessReportId: latestReport.id,
            totalSteps: sorted.length,
        })
        .returning();

    const roadmap = inserted[0];
    if (!roadmap) {
        throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create roadmap",
        });
    }

    await db.insert(roadmapSteps).values(
        sorted.map((skillId, index) => ({
            roadmapId: roadmap.id,
            skillId,
            orderIndex: index + 1,
            status: "pending",
        }))
    );

    return {
        roadmapId: roadmap.id,
        totalSteps: sorted.length,
        steps: sorted.map((id, index) => {
            const item = roadmapMap.get(id)!;
            return {
                step: index + 1,
                skill: item.skillName,
                priority: item.priority,
            };
        }),
        roadmap: sorted.map((id, index) => {
            const item = roadmapMap.get(id)!;
            return {
                step: index + 1,
                skill: item.skillName,
                priority: item.priority,
            };
        }),
    };
}

function getRoleSkillWeight(row: { weight: string } & Record<string, unknown>) {
    const importanceValue =
        typeof row.importance === "string" || typeof row.importance === "number"
            ? Number(row.importance)
            : Number(row.weight);

    return clamp(importanceValue, 0, 100);
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}
