import { router } from "../index";
import { aiRouter } from "./ai.router";

export const appRouter = router({
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
