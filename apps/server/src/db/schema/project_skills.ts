import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { skills } from "./skills";

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