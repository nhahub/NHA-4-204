import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

import { auth } from "@/shared/auth/auth";
import { fromNodeHeaders } from "better-auth/node";

export async function createContext(opts: CreateExpressContextOptions) {
  const headers = fromNodeHeaders(opts.req.headers);
  const session = await auth.api.getSession({
    headers,
  });
  return {
    session,
    headers,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
