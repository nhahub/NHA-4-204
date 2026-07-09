import { router } from "../index";
import { authRouter } from "../../modules/auth/routes/trpc_route";
import { cvRouter } from "../../modules/cv/routes/trpc_route";
import { githubRouter } from "../../modules/github/routes/github_route";
import { rolesRouter } from "../../modules/roles/routes/trpc_route";
import { skillsRouter } from "../../modules/skills/routes/skills_route";
import { roadmapRouter } from "../../modules/roadmap/routes/roadmap_trpc";
import { readinessRouter } from "../../modules/roadmap/routes/readiness_trpc";
import { userRouter } from "@/modules/user/routes/user_trpc";
import { curriculumRouter } from "@/modules/skills/routes/circurriculum_route";
import { ResourcesRouter } from "@/modules/skills/routes/resources_route";
import { calendarRouter } from "@/modules/calendar/routes/calendar_trpc";
import { aiRouter } from "./ai.router";

export const appRouter = router({
    auth: authRouter,
    cv: cvRouter,
    github: githubRouter,
    roles: rolesRouter,
    skills: skillsRouter,
    roadmap: roadmapRouter,
    readiness: readinessRouter,
    user: userRouter ,
    curriculum:curriculumRouter,
    Resources:ResourcesRouter,
    calendar: calendarRouter,
    ai: aiRouter
});

export type AppRouter = typeof appRouter;

