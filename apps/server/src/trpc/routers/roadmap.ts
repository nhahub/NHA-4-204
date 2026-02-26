import { z } from "zod";
import { router, publicProcedure } from "../index";
import { db } from "@/db";
import {
    roles,
    roleSkills,
    readinessReports,
    skillGapResults,
    roadmaps,
    roadmapSteps,
    skills,
    skillDependencies,
} from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";

export const roadmapRouter = router({
    generate: publicProcedure
        .input(
            z.object({
                userId: z.string(),
                roleName: z.string(),
            })
        )
        .mutation(async ({ input }) => {
            const { userId, roleName } = input;

            // Get role
            const role = await db.query.roles.findFirst({
                where: eq(roles.name, roleName),
            });

            if (!role) {
                throw new Error("Role not found");
            }

            // Get latest readiness report
            const latestReport = await db.query.readinessReports.findFirst({
                where: eq(readinessReports.userId, userId),
                orderBy: desc(readinessReports.createdAt),
            });

            if (!latestReport || latestReport.roleId !== role.id) {
                throw new Error("No readiness report found for this role");
            }

            // Delete previous roadmap for this report
            await db
                .delete(roadmaps)
                .where(eq(roadmaps.readinessReportId, latestReport.id));

            // Get skill gaps
            const gaps = await db
                .select()
                .from(skillGapResults)
                .where(eq(skillGapResults.reportId, latestReport.id));

            if (gaps.length === 0) {
                return { message: "No skill gaps found. You're ready." };
            }

            const gapSkillIds = gaps.map(g => g.skillId);

            // Load all related data
            const roleSkillWeights = await db
                .select()
                .from(roleSkills)
                .where(eq(roleSkills.roleId, role.id));

            const skillList = await db
                .select()
                .from(skills)
                .where(inArray(skills.id, gapSkillIds));

            const dependencies = await db
                .select()
                .from(skillDependencies)
                .where(inArray(skillDependencies.skillId, gapSkillIds));

            // Build roadmap items
            const roadmapMap = new Map<string, {
                skillId: string;
                skillName: string;
                weight: number;
                priority: "high" | "medium";
            }>();

            for (const gap of gaps) {
                const weight =
                    roleSkillWeights.find(r => r.skillId === gap.skillId)?.weight ?? 0;

                const skill = skillList.find(s => s.id === gap.skillId);

                roadmapMap.set(gap.skillId, {
                    skillId: gap.skillId,
                    skillName: skill?.name ?? "Unknown",
                    weight: Number(weight),
                    priority: gap.gapType === "missing" ? "high" : "medium",
                });
            }

            // Build graph for topo sort
            const graph = new Map<string, string[]>();
            const inDegree = new Map<string, number>();

            for (const id of roadmapMap.keys()) {
                graph.set(id, []);
                inDegree.set(id, 0);
            }

            for (const dep of dependencies) {
                if (!roadmapMap.has(dep.dependsOnSkillId)) continue;

                graph.get(dep.dependsOnSkillId)?.push(dep.skillId);
                inDegree.set(
                    dep.skillId,
                    (inDegree.get(dep.skillId) ?? 0) + 1
                );
            }

            // Kahn's algorithm
            const queue: string[] = [];

            for (const [id, degree] of inDegree.entries()) {
                if (degree === 0) {
                    queue.push(id);
                }
            }

            const sorted: string[] = [];

            while (queue.length > 0) {
                // Sort queue internally by priority + weight
                queue.sort((a, b) => {
                    const A = roadmapMap.get(a)!;
                    const B = roadmapMap.get(b)!;

                    const priorityScore = (p: string) =>
                        p === "high" ? 2 : 1;

                    const pDiff =
                        priorityScore(B.priority) -
                        priorityScore(A.priority);

                    if (pDiff !== 0) return pDiff;

                    return B.weight - A.weight;
                });

                const current = queue.shift()!;
                sorted.push(current);

                for (const neighbor of graph.get(current) ?? []) {
                    inDegree.set(
                        neighbor,
                        (inDegree.get(neighbor) ?? 0) - 1
                    );

                    if (inDegree.get(neighbor) === 0) {
                        queue.push(neighbor);
                    }
                }
            }

            if (sorted.length !== roadmapMap.size) {
                throw new Error("Dependency cycle detected in roadmap generation.");
            }

            // Insert roadmap
            const inserted = await db
                .insert(roadmaps)
                .values({
                    userId,
                    roleId: role.id,
                    readinessReportId: latestReport.id,
                    totalSteps: sorted.length,
                })
                .returning();

            const roadmap = inserted[0];
            if (!roadmap) {
                throw new Error("Failed to create roadmap");
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
                totalSteps: sorted.length,
                roadmap: sorted.map((id, index) => {
                    const item = roadmapMap.get(id)!;
                    return {
                        step: index + 1,
                        skill: item.skillName,
                        priority: item.priority,
                    };
                }),
            };
        }),
});