import { pgTable, uuid, text, boolean, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const skills = pgTable("skills", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().unique(),
    hasNoDependencies: boolean("has_no_dependencies")
        .default(false)
        .notNull(),
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