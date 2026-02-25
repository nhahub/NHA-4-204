// src/db/schema/readiness_reports.ts

import {
    pgTable,
    uuid,
    text,
    numeric,
    timestamp,
} from "drizzle-orm/pg-core";
import { roles } from "./roles";
import { user } from "./auth";

export const readinessReports = pgTable("readiness_reports", {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),

    roleId: uuid("role_id")
        .notNull()
        .references(() => roles.id, { onDelete: "cascade" }),

    skillMatchScore: numeric("skill_match_score").notNull(),
    projectScore: numeric("project_score").notNull(),
    githubScore: numeric("github_score").notNull(),
    totalScore: numeric("total_score").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
});