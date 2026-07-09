import { pgTable, uuid, text, uniqueIndex, integer } from "drizzle-orm/pg-core";
import { skills } from "./skills_schema";
import { relations} from "drizzle-orm";



export const skillCurriculumNodes = pgTable("skill_curriculum_nodes", {
    id: uuid("id").defaultRandom().primaryKey(),
    skillId: uuid("skill_id")
        .notNull()
        .references(() => skills.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull(),
    estimatedDurationHours: integer("estimated_duration_hours").notNull().default(2),
    title: text("title").notNull(),
    description: text("description").notNull(),
}, (table) => ({
    unq: uniqueIndex("skill_curriculum_nodes_unq").on(table.skillId, table.orderIndex)
}));

export const curriculumNodeResources = pgTable("curriculum_node_resources", {
    id: uuid("id").defaultRandom().primaryKey(),
    curriculumNodeId: uuid("curriculum_node_id")
        .notNull()
        .references(() => skillCurriculumNodes.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: text("type").notNull(),
    url: text("url").notNull(),
    displayOrder: integer("display_order").notNull(),
}, (table) => ({
    unq: uniqueIndex("curriculum_node_resources_unq").on(table.curriculumNodeId, table.url)
}));


export const skillCurriculumNodesRelations = relations(skillCurriculumNodes, ({ one, many }) => ({
    skill: one(skills, {
        fields: [skillCurriculumNodes.skillId],
        references: [skills.id],
    }),
    resources: many(curriculumNodeResources),
}));

export const curriculumNodeResourcesRelations = relations(curriculumNodeResources, ({ one }) => ({
    curriculumNode: one(skillCurriculumNodes, {
        fields: [curriculumNodeResources.curriculumNodeId],
        references: [skillCurriculumNodes.id],
    }),
}));