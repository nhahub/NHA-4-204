import { pgTable, uuid, integer, text } from "drizzle-orm/pg-core";
import { roadmaps } from "./roadmaps";
import { skills } from "./skills";

export const roadmapSteps = pgTable("roadmap_steps", {
    id: uuid("id").defaultRandom().primaryKey(),
    roadmapId: uuid("roadmap_id")
        .references(() => roadmaps.id, { onDelete: "cascade" })
        .notNull(),
    skillId: uuid("skill_id")
        .references(() => skills.id)
        .notNull(),
    orderIndex: integer("order_index").notNull(),
    status: text("status").notNull(),
});