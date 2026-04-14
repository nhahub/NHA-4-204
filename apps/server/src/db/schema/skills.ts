import { pgTable, text, json, timestamp, integer, index } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const userSkills = pgTable("user_skills", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  skills: json("skills"), // string[]
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const skillGapAnalysis = pgTable(
  "skill_gap_analysis",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    missingSkills: json("missing_skills"), // string[]
    readinessScore: integer("readiness_score"),
    lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  },
  (table) => [index("sga_user_id_idx").on(table.userId)],
);
