import { pgTable, uuid, text, boolean, numeric, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "../../user/db/schema";
import { projects } from "../../github/db/schema"; 
import { roleSkills, skillCurriculumNodes } from "@/db/schema";

export const skills = pgTable("skills", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().unique(),
    hasNoDependencies: boolean("has_no_dependencies")
        .default(true)
        .notNull(),
    normalizedName: text("normalized_name").notNull().unique(),
});

export const skillDependencies = pgTable(
    "skill_dependencies",
    {
        skillId: uuid("skill_id")
            .notNull()
            .references(() => skills.id, { onDelete: "cascade" }),

        dependsOnSkillId: uuid("depends_on_skill_id")
            .notNull()
            .references(() => skills.id, { onDelete: "cascade" }),
    },
    (t) => ({
        pk: primaryKey({ columns: [t.skillId, t.dependsOnSkillId] }),
    })
);

export const skillsRelations = relations(skills, ({ many }) => ({
    dependencies: many(skillDependencies, {
        relationName: "skill_dependencies_from",
    }),
    dependents: many(skillDependencies, {
        relationName: "skill_dependencies_to",
    }),
    roleSkills: many(roleSkills),
    skillCurriculumNodes: many(skillCurriculumNodes),
}));

export const skillDependenciesRelations = relations(
    skillDependencies,
    ({ one }) => ({
        skill: one(skills, {
            fields: [skillDependencies.skillId],
            references: [skills.id],
            relationName: "skill_dependencies_from",
        }),
        dependsOn: one(skills, {
            fields: [skillDependencies.dependsOnSkillId],
            references: [skills.id],
            relationName: "skill_dependencies_to",
        }),
    })
);

export const userSkills = pgTable(
    "user_skills",
    {
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),

        skillId: uuid("skill_id")
            .notNull()
            .references(() => skills.id, { onDelete: "cascade" }),

        strengthScore: numeric("strength_score").notNull(),
    },
    (t) => ({
        pk: primaryKey({ columns: [t.userId, t.skillId] }),
    })
);

export const projectSkills = pgTable(
    "project_skills",
    {
        projectId: uuid("project_id")
            .references(() => projects.id, { onDelete: "cascade" })
            .notNull(),
        skillId: uuid("skill_id")
            .references(() => skills.id, { onDelete: "cascade" })
            .notNull(),
    },
    (t) => ({
        pk: primaryKey({ columns: [t.projectId, t.skillId] }),
    })
);


