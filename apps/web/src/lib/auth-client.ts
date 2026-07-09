import { env } from "@careergps/env/web";
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: env.VITE_SERVER_URL,
  plugins: [
    inferAdditionalFields({
      user: {
        roleId: {
          type: "string",
        },
        availableDaysPerWeek: {
          type: "number",
          isNumber: true,
        },
        availableWeekdays: {
          type: "number[]",
          isNumber: true,
        },
        availableHoursPerDay: {
          type: "number",
          isNumber: true,
        },
        timezone: {
          type: "string",
        },
        preferredStartTime: {
          type: "string",
        },
      },
    }),
  ],
});
