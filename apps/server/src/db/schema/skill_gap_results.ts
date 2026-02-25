// src/db/schema/skill_gap_results.ts

import { pgTable, uuid, text, numeric } from "drizzle-orm/pg-core";
import { readinessReports } from "./readiness_reports";
import { skills } from "./skills";

export const skillGapResults = pgTable("skill_gap_results", {
    id: uuid("id").defaultRandom().primaryKey(),

    reportId: uuid("report_id")
        .notNull()
        .references(() => readinessReports.id, { onDelete: "cascade" }),

    skillId: uuid("skill_id")
        .notNull()
        .references(() => skills.id, { onDelete: "cascade" }),

    gapType: text("gap_type").notNull(),
    strengthScore: numeric("strength_score").notNull(),
});