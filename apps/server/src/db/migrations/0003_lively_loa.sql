ALTER TABLE "roadmaps" DROP CONSTRAINT "roadmaps_user_id_unique";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "available_days_per_week" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "available_hours_per_day" integer;--> statement-breakpoint
ALTER TABLE "roadmaps" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;