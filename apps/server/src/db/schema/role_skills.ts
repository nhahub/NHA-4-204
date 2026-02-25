import { pgTable, uuid, numeric, primaryKey } from "drizzle-orm/pg-core";
import { roles } from "./roles";
import { skills } from "./skills";

export const roleSkills = pgTable(
    "role_skills",
    {
        roleId: uuid("role_id")
            .notNull()
            .references(() => roles.id, { onDelete: "cascade" }),

        skillId: uuid("skill_id")
            .notNull()
            .references(() => skills.id, { onDelete: "cascade" }),

        weight: numeric("weight").notNull(),
    },
    (t) => ({
        pk: primaryKey({ columns: [t.roleId, t.skillId] }),
    })
);