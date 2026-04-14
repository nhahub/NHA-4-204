import { router } from "../index";
import { authRouter } from "./auth";
import { profileRouter } from "./profile";
import { aiRouter } from "./ai";
import { skillsRouter } from "./skills";
import { roadmapRouter } from "./roadmap";
import { dashboardRouter } from "./dashboard";

export const appRouter = router({
    auth: authRouter,
    profile: profileRouter,
    ai: aiRouter,
    skills: skillsRouter,
    roadmap: roadmapRouter,
    dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
