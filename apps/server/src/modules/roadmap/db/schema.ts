import { pgTable, uuid, text, timestamp, boolean, numeric, jsonb, uniqueIndex, integer } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { user } from "../../user/db/schema";
import { roles } from "../../roles/db/schema";
import { skillCurriculumNodes } from "@/modules/skills/db/curriculum_schema";


export const roadmaps = pgTable("roadmaps", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),

    roleId: uuid("role_id")
        .notNull()
        .references(() => roles.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    description: text("description"),

    isActive: boolean("is_active").default(true).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    unq: uniqueIndex("roadmaps_user_role_active_unq")
        .on(table.userId, table.roleId)
        .where(sql`is_active = true`)
}));


export const roadmapNodes = pgTable("roadmap_nodes", {
    id: uuid("id").defaultRandom().primaryKey(),
    roadmapId: uuid("roadmap_id")
        .notNull()
        .references(() => roadmaps.id, { onDelete: "cascade" }),

    curriculumNodeId: uuid("curriculum_node_id")
        .notNull()
        .references(() => skillCurriculumNodes.id, { onDelete: "restrict" }),

    status: text("status").notNull().default("pending"),
    orderIndex: integer("order_index").notNull(),
    priority: text("priority").notNull().default("medium"),
    completedAt: timestamp("completed_at"),
});

export const roadmapsRelations = relations(roadmaps, ({ many }) => ({
    nodes: many(roadmapNodes),
}));

export const roadmapNodesRelations = relations(roadmapNodes, ({ one }) => ({
    roadmap: one(roadmaps, {
        fields: [roadmapNodes.roadmapId],
        references: [roadmaps.id],
    }),
    curriculumNode: one(skillCurriculumNodes, {
        fields: [roadmapNodes.curriculumNodeId],
        references: [skillCurriculumNodes.id],
    }),
}));

export const skillGapResults = pgTable("skill_gap_results", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),

    roleId: uuid("role_id")
        .notNull()
        .references(() => roles.id, { onDelete: "cascade" }),

    missingSkills: jsonb("missing_skills").notNull(),
    matchScore: numeric("match_score").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const readinessReports = pgTable("readiness_reports", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),

    roleId: uuid("role_id")
        .notNull()
        .references(() => roles.id, { onDelete: "cascade" }),

    skillMatchScore: numeric("skill_match_score").notNull(),
    generalGithubScore: numeric("general_github_score").notNull(),
    overallReadinessScore: numeric("overall_readiness_score").notNull(),

    feedback: text("feedback").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
});
