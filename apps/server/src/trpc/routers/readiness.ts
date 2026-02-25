import { z } from "zod";
import { router, publicProcedure } from "../index";
import { db } from "@/db";
import {
    roles,
    roleSkills,
    userSkills,
    projects,
    githubStats,
    readinessReports,
    skillGapResults,
    skills,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export const readinessRouter = router({
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

            // Required skills for role
            const requiredSkills = await db
                .select()
                .from(roleSkills)
                .where(eq(roleSkills.roleId, role.id));

            const userSkillList = await db
                .select()
                .from(userSkills)
                .where(eq(userSkills.userId, userId));

            let totalWeight = 0;
            let matchedWeight = 0;

            const missingSkills: string[] = [];
            const weakSkills: string[] = [];

            for (const req of requiredSkills) {
                totalWeight += Number(req.weight);

                const match = userSkillList.find(
                    (u) => u.skillId === req.skillId
                );

                const skillInfo = await db.query.skills.findFirst({
                    where: eq(skills.id, req.skillId),
                });

                if (!match) {
                    if (skillInfo) {
                        missingSkills.push(skillInfo.name);
                    }
                    continue;
                }

                matchedWeight += Number(req.weight);

                if (Number(match.strengthScore) < 50) {
                    if (skillInfo) {
                        weakSkills.push(skillInfo.name);
                    }
                }
            }

            const skillMatchScore =
                totalWeight === 0 ? 0 : (matchedWeight / totalWeight) * 100;

            // Project strength (average complexity)
            const userProjects = await db
                .select()
                .from(projects)
                .where(eq(projects.userId, userId));

            const projectScore =
                userProjects.length === 0
                    ? 0
                    : userProjects.reduce(
                        (sum, p) => sum + Number(p.complexityScore),
                        0
                    ) / userProjects.length;

            // GitHub score
            const github = await db.query.githubStats.findFirst({
                where: eq(githubStats.userId, userId),
            });

            const githubScore = github ? Number(github.activityScore) : 0;

            // Final score
            const totalScore =
                skillMatchScore * 0.5 +
                projectScore * 0.3 +
                githubScore * 0.2;

            // Store readiness report
            const insertedReports = await db
                .insert(readinessReports)
                .values({
                    userId,
                    roleId: role.id,
                    skillMatchScore: skillMatchScore.toString(),
                    projectScore: projectScore.toString(),
                    githubScore: githubScore.toString(),
                    totalScore: totalScore.toString(),
                })
                .returning();

            const report = insertedReports.at(0);

            if (!report) {
                throw new Error("Failed to create readiness report");
            }

            // Store skill gaps
            for (const skillName of missingSkills) {
                const skill = await db.query.skills.findFirst({
                    where: eq(skills.name, skillName),
                });

                if (!skill) continue;

                await db.insert(skillGapResults).values({
                    reportId: report.id,
                    skillId: skill.id,
                    gapType: "missing",
                    strengthScore: "0",
                });
            }

            for (const skillName of weakSkills) {
                const skill = await db.query.skills.findFirst({
                    where: eq(skills.name, skillName),
                });

                if (!skill) continue;

                await db.insert(skillGapResults).values({
                    reportId: report.id,
                    skillId: skill.id,
                    gapType: "weak",
                    strengthScore: "40",
                });
            }

            return {
                skillMatchScore,
                projectScore,
                githubScore,
                totalScore,
                missingSkills,
                weakSkills,
            };
        }),
});