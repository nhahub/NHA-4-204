import { pgTable, text, json, timestamp, integer, index } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const roadmaps = pgTable(
  "roadmaps",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    roadmapJson: json("roadmap_json"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("rm_user_id_idx").on(table.userId)],
);

export const userProgress = pgTable(
  "user_progress",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    roadmapId: text("roadmap_id")
      .notNull()
      .references(() => roadmaps.id, { onDelete: "cascade" }),
    completedSteps: json("completed_steps"), // string[] of task IDs
    points: integer("points").default(0).notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("up_user_id_idx").on(table.userId),
    index("up_roadmap_id_idx").on(table.roadmapId),
  ],
);
