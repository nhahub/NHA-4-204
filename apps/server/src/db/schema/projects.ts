// src/db/schema/projects.ts

import { pgTable, uuid, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const projects = pgTable("projects", {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    description: text("description"),
    source: text("source").notNull(),

    complexityScore: numeric("complexity_score").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
});