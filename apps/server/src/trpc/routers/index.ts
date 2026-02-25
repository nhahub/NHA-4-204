import { router } from "../index";
import { githubRouter } from "./github";

export const appRouter = router({
    github: githubRouter,
});

export type AppRouter = typeof appRouter;
