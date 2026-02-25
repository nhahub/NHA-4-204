import { pgTable, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const githubStats = pgTable("github_stats", {
    userId: text("user_id")
        .primaryKey()
        .references(() => user.id, { onDelete: "cascade" }),

    username: text("username").notNull(),
    reposCount: integer("repos_count").notNull(),
    totalStars: integer("total_stars").notNull(),
    activityScore: numeric("activity_score").notNull(),
    lastSynced: timestamp("last_synced").defaultNow().notNull(),
});