// src/db/schema/roadmaps.ts

import { pgTable, uuid, text, integer } from "drizzle-orm/pg-core";
import { readinessReports } from "./readiness_reports";
import { user } from "./auth";

export const roadmaps = pgTable("roadmaps", {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),

    roleId: uuid("role_id").notNull(),

    readinessReportId: uuid("readiness_report_id")
        .notNull()
        .references(() => readinessReports.id, { onDelete: "cascade" }),

    totalSteps: integer("total_steps").notNull(),
}); 