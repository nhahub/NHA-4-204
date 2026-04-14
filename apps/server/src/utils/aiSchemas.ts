import { z } from "zod";

export const aiRoadmapStepSchema = z.object({
  step: z.number(),
  title: z.string(),
  description: z.string(),
  resources: z.array(z.string()),
});

export const aiRoadmapSchema = z.object({
  role: z.string(),
  steps: z.array(aiRoadmapStepSchema),
});

export const aiSkillGapSchema = z.object({
  role: z.string(),
  missingSkills: z.array(z.string()),
  readinessScore: z.number().min(0).max(100),
});

export const aiCvParsingSchema = z.object({
  skills: z.array(z.string()),
});

export const aiGithubAnalysisSchema = z.object({
  activityScore: z.number(),
  topLanguages: z.array(z.string()),
  topProjects: z.array(z.string()),
});
