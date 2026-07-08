import { relations } from "drizzle-orm";
import { pgEnum, pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { user } from "../../user/db/schema"

export const cvStatus = pgEnum("cvStatus", ["pending", "parsing", "completed", "failed"]);

export const cv = pgTable(
  "cv",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    fileUrl: text("file_url").notNull(),
    publicId: text("public_id").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    parsedData: jsonb("parsed_data"),
    status: cvStatus("status").default("pending").notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [index("cv_user_id_idx").on(table.userId)],
);


export const cvRelations = relations(cv, ({ one }) => ({
  user: one(user, {
    fields: [cv.userId],
    references: [user.id],
  }),
}));
