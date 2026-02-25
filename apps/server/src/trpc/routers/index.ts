import { router } from "../index";
import { githubRouter } from "./github";
import { readinessRouter } from "./readiness";

export const appRouter = router({
    github: githubRouter,
    readiness: readinessRouter,
});

export type AppRouter = typeof appRouter;
