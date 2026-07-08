import { pgTable, text, integer, numeric, timestamp, uuid, doublePrecision, unique } from "drizzle-orm/pg-core";
import { user } from "../../user/db/schema";

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

        complexityScore: doublePrecision("complexity_score").notNull(),

        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => ({
        userTitleUnique: unique().on(table.userId, table.title),
    })
);

