import { db } from "@/db";
import {cv} from "@/db/schema";
import { eq , lt , and } from "drizzle-orm";

const CHECK_INTERVAL_MS = 60 * 1000; // 1 minute
const STUCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

async function checkTimeouts() {
  try {
    const stuckCVs = await db.update(cv)
    .set({ status: "failed", errorMessage: "Parsing timeout — no webhook received" })
    .where(
      and(
        eq(cv.status, "parsing"),
        lt(cv.createdAt, new Date(Date.now() - STUCK_THRESHOLD_MS))
      ))
      .returning({ id: cv.id })
      
      if (stuckCVs.length > 0){
         console.info(`[cv-timeout] Marked ${stuckCVs.length} CVs as failed`) }

  } catch (err) {
    console.error("[cv-timeout] error", err);
  }
}

// Start interval
setInterval(checkTimeouts, CHECK_INTERVAL_MS);

// Run immediately on startup
checkTimeouts().catch((e) => console.error("cv-timeout startup error", e));
