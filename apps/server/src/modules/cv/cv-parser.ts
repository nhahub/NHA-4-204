import { db } from "@/db";
import { cv } from "@/db/schema";
import { eq } from "drizzle-orm";
import { env } from "@careergps/env/server";

export async function parseCVData(cvId: string, url: string): Promise<unknown> {
  try {
    // mark as parsing before sending

    // console.log("entered in parsing function");
    // console.log("CV ID", cvId);
    // console.log("url", url);
    await db
      .update(cv)
      .set({ status: "parsing" })
      .where(eq(cv.id, cvId));

    // console.log("cv marked as parsing", cvId);

    const parsingEndPoint = new URL("parse", env.AI_TEAM_URL).toString();



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
    // console.log();
    // console.log("cv sent to AI team for parsing", cvId);
    // console.log();
    // console.log("### Body #### : ", body);
    // console.log();
    // console.log("&&& RES %%% : ", res);
    // console.log();


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
