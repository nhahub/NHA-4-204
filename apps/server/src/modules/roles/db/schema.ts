import { pgTable, uuid, text, primaryKey, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { skills } from "../../skills/db/skills_schema";

export const roles = pgTable("roles", {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull().unique(),
    description: text("description"),
});

export const roleSkills = pgTable(
    "role_skills",
    {
        roleId: uuid("role_id")
            .notNull()
            .references(() => roles.id, { onDelete: "cascade" }),

        skillId: uuid("skill_id")
            .notNull()
            .references(() => skills.id, { onDelete: "cascade" }),

        isCore: boolean("is_core").default(false).notNull(),
    },
    (t) => ({
        pk: primaryKey({ columns: [t.roleId, t.skillId] }),
    })
);

export const rolesRelations = relations(roles, ({ many }) => ({
    skills: many(roleSkills),
}));

export const roleSkillsRelations = relations(roleSkills, ({ one }) => ({
    role: one(roles, {
        fields: [roleSkills.roleId],
        references: [roles.id],
    }),
    skill: one(skills, {
        fields: [roleSkills.skillId],
        references: [skills.id],
    }),
}));

