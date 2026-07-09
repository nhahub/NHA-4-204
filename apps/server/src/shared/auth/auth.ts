import { db } from "@/db";
import * as authSchema from "@/modules/auth/db/schema";
import { user } from "@/modules/user/db/schema";
import { env } from "@careergps/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { ...authSchema, user },
  }),
  trustedOrigins: [env.CORS_ORIGIN],
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: true,
    },
  },
  user: {
    additionalFields: {
      roleId: {
        type: "string",
        input: false,
      },
      availableDaysPerWeek: {
        type: "number",
        input: true,
      },
      availableWeekdays: {
        type: "number[]",
        input: true,
      },
      availableHoursPerDay: {
        type: "number",
        input: true,
      },
      timezone: {
        type: "string",
        input: true,
      },
      preferredStartTime: {
        type: "string",
        input: true,
      },
    }
  },
  plugins: [],
});
