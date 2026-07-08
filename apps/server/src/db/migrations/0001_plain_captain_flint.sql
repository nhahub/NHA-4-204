CREATE TYPE "public"."cvStatus" AS ENUM('pending', 'parsing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "cv" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"file_url" text NOT NULL,
	"public_id" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"parsed_data" jsonb,
	"status" "cvStatus" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cached_internal_roadmaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"skill_id" uuid NOT NULL,
	"level" text NOT NULL,
	"duration_days" numeric NOT NULL,
	"daily_minutes" numeric NOT NULL,
	"roadmap_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "roles" DROP CONSTRAINT "roles_name_unique";--> statement-breakpoint
ALTER TABLE "skill_gap_results" DROP CONSTRAINT "skill_gap_results_report_id_readiness_reports_id_fk";
--> statement-breakpoint
ALTER TABLE "skill_gap_results" DROP CONSTRAINT "skill_gap_results_skill_id_skills_id_fk";
--> statement-breakpoint
ALTER TABLE "roadmaps" DROP CONSTRAINT "roadmaps_readiness_report_id_readiness_reports_id_fk";
--> statement-breakpoint
ALTER TABLE "roadmap_steps" DROP CONSTRAINT "roadmap_steps_skill_id_skills_id_fk";
--> statement-breakpoint
ALTER TABLE "roadmap_steps" ALTER COLUMN "order_index" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "roadmap_steps" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role_id" uuid;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "role_skills" ADD COLUMN "is_core" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "readiness_reports" ADD COLUMN "general_github_score" numeric NOT NULL;--> statement-breakpoint
ALTER TABLE "readiness_reports" ADD COLUMN "overall_readiness_score" numeric NOT NULL;--> statement-breakpoint
ALTER TABLE "readiness_reports" ADD COLUMN "feedback" text NOT NULL;--> statement-breakpoint
ALTER TABLE "skill_gap_results" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "skill_gap_results" ADD COLUMN "role_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "skill_gap_results" ADD COLUMN "missing_skills" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "skill_gap_results" ADD COLUMN "match_score" numeric NOT NULL;--> statement-breakpoint
ALTER TABLE "skill_gap_results" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "roadmaps" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "roadmaps" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "roadmaps" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "roadmaps" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "roadmaps" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "roadmap_steps" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "roadmap_steps" ADD COLUMN "description" text NOT NULL;--> statement-breakpoint
ALTER TABLE "roadmap_steps" ADD COLUMN "cached_roadmap_id" uuid;--> statement-breakpoint
ALTER TABLE "roadmap_steps" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "cv" ADD CONSTRAINT "cv_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cached_internal_roadmaps" ADD CONSTRAINT "cached_internal_roadmaps_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cv_user_id_idx" ON "cv" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cached_internal_roadmap_unq" ON "cached_internal_roadmaps" USING btree ("skill_id","level","duration_days","daily_minutes");--> statement-breakpoint
ALTER TABLE "skill_gap_results" ADD CONSTRAINT "skill_gap_results_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_gap_results" ADD CONSTRAINT "skill_gap_results_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmaps" ADD CONSTRAINT "roadmaps_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_steps" ADD CONSTRAINT "roadmap_steps_cached_roadmap_id_cached_internal_roadmaps_id_fk" FOREIGN KEY ("cached_roadmap_id") REFERENCES "public"."cached_internal_roadmaps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_steps" ADD CONSTRAINT "roadmap_steps_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "roles" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "role_skills" DROP COLUMN "weight";--> statement-breakpoint
ALTER TABLE "readiness_reports" DROP COLUMN "project_score";--> statement-breakpoint
ALTER TABLE "readiness_reports" DROP COLUMN "github_score";--> statement-breakpoint
ALTER TABLE "readiness_reports" DROP COLUMN "total_score";--> statement-breakpoint
ALTER TABLE "skill_gap_results" DROP COLUMN "report_id";--> statement-breakpoint
ALTER TABLE "skill_gap_results" DROP COLUMN "skill_id";--> statement-breakpoint
ALTER TABLE "skill_gap_results" DROP COLUMN "gap_type";--> statement-breakpoint
ALTER TABLE "skill_gap_results" DROP COLUMN "strength_score";--> statement-breakpoint
ALTER TABLE "roadmaps" DROP COLUMN "readiness_report_id";--> statement-breakpoint
ALTER TABLE "roadmaps" DROP COLUMN "total_steps";--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_title_unique" UNIQUE("title");