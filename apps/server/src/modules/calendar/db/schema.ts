import { pgTable, text, timestamp, uuid, integer, date, time, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "../../user/db/schema";
import { roadmapNodes } from "../../roadmap/db/schema";

export const calendarEventStatusEnum = pgEnum("calendar_event_status", ["scheduled", "completed", "skipped"]);

export const calendarEvents = pgTable("calendar_events", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    roadmapNodeId: uuid("roadmap_node_id")
        .notNull()
        .references(() => roadmapNodes.id, { onDelete: "cascade" }),
    sessionIndex: integer("session_index").notNull(),
    totalSessionsForNode: integer("total_sessions_for_node").notNull(),
    date: date("date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    status: calendarEventStatusEnum("status").default("scheduled").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
}, (table) => ({
    unq: uniqueIndex("calendar_events_user_node_session_unq").on(table.userId, table.roadmapNodeId, table.sessionIndex)
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
    user: one(user, {
        fields: [calendarEvents.userId],
        references: [user.id],
    }),
    roadmapNode: one(roadmapNodes, {
        fields: [calendarEvents.roadmapNodeId],
        references: [roadmapNodes.id],
    }),
}));
