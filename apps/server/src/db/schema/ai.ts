import { pgTable, text, json, timestamp, index } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const aiJobs = pgTable(
  "ai_jobs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // 'ROADMAP_GENERATION' etc.
    status: text("status").notNull(), // 'pending', 'processing', 'completed', 'failed'
    inputPayload: json("input_payload"),
    resultPayload: json("result_payload"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("jobs_user_id_idx").on(table.userId)],
);
