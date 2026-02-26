import { router } from "../index";
import { authRouter } from "./auth";
import { githubRouter } from "./github";
import { readinessRouter } from "./readiness";
import { roadmapRouter } from "./roadmap";
import { rolesRouter } from "./roles";
import { skillsRouter } from "./skills";

export const appRouter = router({
    auth: authRouter,
    github: githubRouter,
    readiness: readinessRouter,
    roadmap: roadmapRouter,
    roles: rolesRouter,
    skills: skillsRouter,
});

export type AppRouter = typeof appRouter;
