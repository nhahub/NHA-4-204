import { db } from "@/db";
import {cv} from "@/db/schema";
import { eq } from "drizzle-orm";
import { env } from "@careergps/env/server";

export async function sendCVToAITeam(cvId: string, fileUrl: string): Promise<void> {
  // mark as parsing before sending
  await db.update(cv).set({ status: "parsing" }).where(eq(cv.id, cvId));

  const parsingEndPoint = `${env.AI_TEAM_URL}/`;

  const body = JSON.stringify({
    cvId,
    fileUrl,
    callbackUrl: `${env.SERVER_URL}/cv/webhook`,
  });

  const res = await fetch(parsingEndPoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Secret": env.AI_TEAM_SECRET,
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`AI Team rejected request: ${res.status}`);
  }
}

export default sendCVToAITeam;
