import { pgTable, text, uuid, numeric, primaryKey } from "drizzle-orm/pg-core";
import { skills } from "./skills";
import { user } from "./auth";

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