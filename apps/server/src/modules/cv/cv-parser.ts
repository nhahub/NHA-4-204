import { db } from "@/db";
import { cv } from "@/db/schema";
import { eq } from "drizzle-orm";
import { env } from "@careergps/env/server";

export async function parseCVData(cvId: string, url: string): Promise<unknown> {
  try {

    await db
      .update(cv)
      .set({ status: "parsing" })
      .where(eq(cv.id, cvId));

    const parsingEndPoint = new URL("parse", env.AI_TEAM_PARSER_URL).toString();

    const body = JSON.stringify({
      cvId,
      url
    });

    const res = await fetch(parsingEndPoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });

    if (!res.ok) {
      await db
        .update(cv)
        .set({ status: "failed" })
        .where(eq(cv.id, cvId));
      // console.log("cv marked as failed", cvId);
      throw new Error(`AI Team rejected request: ${res.status}`);
    }

    return await res.json();

  } catch (error) {
    console.error("parsing service failed:", error);
    await db
      .update(cv)
      .set({ status: "failed" })
      .where(eq(cv.id, cvId));
    throw error;
  }

}

export default parseCVData;
