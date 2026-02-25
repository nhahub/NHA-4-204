import { pgTable, uuid, text } from "drizzle-orm/pg-core";

export const skills = pgTable("skills", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().unique(),
});