import { env } from "@careergps/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const pool = new Pool({
    connectionString: env.DATABASE_URL,
});

// Initialize drizzle
export const db = drizzle(pool, {
    schema,
});