import { roles } from "@/db/schema";
import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, uuid, integer ,check, time } from "drizzle-orm/pg-core";


export const user = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    roleId: uuid("role_id")
        .references(() => roles.id, { onDelete: "set null" }),
    availableDaysPerWeek: integer("available_days_per_week"),
    availableWeekdays: integer("available_weekdays").array(),
    availableHoursPerDay: integer("available_hours_per_day"),
    timezone: text("timezone"),
    preferredStartTime: time("preferred_start_time"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
},(table) => [
    check(
      "available_days_per_week_check",
      sql`${table.availableDaysPerWeek} BETWEEN 1 AND 7`
    ),
    check(
      "available_hours_per_day_check",
      sql`${table.availableHoursPerDay} BETWEEN 1 AND 24`
    ),
  ]);