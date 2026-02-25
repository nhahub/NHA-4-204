import { pgTable, uuid, text, numeric, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const projects = pgTable(
    "projects",
    {
        id: uuid("id").defaultRandom().primaryKey(),

        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),

        title: text("title").notNull(),
        description: text("description"),
        source: text("source").notNull(),

        complexityScore: numeric("complexity_score").notNull(),

        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => ({
        userTitleUnique: uniqueIndex("projects_user_title_unique").on(
            table.userId,
            table.title
        ),
    })
);