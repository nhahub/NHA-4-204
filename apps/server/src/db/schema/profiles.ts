import { pgTable, text, json, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const profiles = pgTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  githubUsername: text("github_username"),
  githubContext: json("github_context"), // Store extracted dependency maps/stats
  linkedinData: json("linkedin_data"),
  cvUrl: text("cv_url"),
  cvText: text("cv_text"), // Store raw extracted PDF text
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
});
