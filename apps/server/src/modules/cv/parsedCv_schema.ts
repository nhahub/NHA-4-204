import { z } from "zod";

export const SkillSchema = z.object({
  name: z.string().min(1),
  level: z.string().nullable(),
});

export const SkillsContainerSchema = z
  .object({
    technical: z.array(SkillSchema).default([]),
    nonTechnical: z.array(SkillSchema).default([]),
  })
  .default({ technical: [], nonTechnical: [] });

export const ExperienceSchema = z.object({
  company: z.string().min(1).nullable(),
  title: z.string().min(1).nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  description: z.string().nullable(),
});

export const ProjectSchema = z.object({
  name: z.string().nullable(),
  description: z.string().nullable(),
  technologies: z.array(z.string()).default([]),
  url: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
});

export const EducationSchema = z.object({
  institution: z.string().min(1).nullable(),
  degree: z.string().nullable(),
  field: z.string().nullable(),
  major: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
});

export const CertificationSchema = z.object({
  name: z.string().nullable(),
  issuer: z.string().nullable(),
  date: z.string().nullable(),
});

export const LinksSchema = z.object({
  github: z.string().nullable(),
  linkedin: z.string().nullable(),
  portfolio: z.string().nullable(),
}).default({ github: null, linkedin: null, portfolio: null });

export const ParsedCVDataSchema = z.object({
  fullName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  summary: z.string().nullable(),

  skills: SkillsContainerSchema,

  experience: z.array(ExperienceSchema).default([]),

  projects: z.array(ProjectSchema).default([]),

  education: z.array(EducationSchema).default([]),

  certifications: z.array(CertificationSchema).default([]),

  languages: z.array(z.string()).default([]),

  links: LinksSchema,
});

// make response schema for validation
export const responseBodySchema = z.discriminatedUnion("status", [
  z.object({
    cvId: z.string().uuid(),
    status: z.literal("completed"),
    parsedData: ParsedCVDataSchema,
  }),

  z.object({
    cvId: z.string().uuid(),
    status: z.literal("failed"),
    errorMessage: z.string(),
  }),
]);


export type ParsedCVData = z.infer<typeof ParsedCVDataSchema>;

export type Skill = z.infer<typeof SkillSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type Certification = z.infer<typeof CertificationSchema>;
export type Links = z.infer<typeof LinksSchema>;
export type responseBodySchema = z.infer<typeof responseBodySchema>;

