import { db } from "@/db";
import { user } from "../../user/db/schema";
import { roadmapNodes, roadmaps } from "../../roadmap/db/schema";
import { skillCurriculumNodes } from "../../skills/db/curriculum_schema";
import { calendarEvents } from "../db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";

const DEFAULT_START_TIME = "18:00:00";

const WEEKDAY_MAP: Record<number, number[]> = {
    1: [3], // Wed
    2: [2, 4], // Tue, Thu
    3: [1, 3, 5], // Mon, Wed, Fri
    4: [1, 2, 4, 5], // Mon, Tue, Thu, Fri
    5: [1, 2, 3, 4, 5], // Mon-Fri
    6: [1, 2, 3, 4, 5, 6], // Mon-Sat
    7: [0, 1, 2, 3, 4, 5, 6], // Sun-Sat (0 is Sunday in JS Date)
};

function formatDate(date: Date): string {
    return date.toISOString().split("T")[0] || "";
}

function addHoursToTime(timeStr: string, hoursToAdd: number): string {
    const parts = timeStr.split(":");
    let hours = parseInt(parts[0] || "0", 10) || 0;
    const minutes = parseInt(parts[1] || "0", 10) || 0;
    const seconds = parseInt(parts[2] || "0", 10) || 0;
    
    hours = (hours + hoursToAdd) % 24;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export async function generateCalendar(userId: string) {
    const userData = await db.query.user.findFirst({
        where: eq(user.id, userId),
    });

    if (!userData) throw new Error("User not found");

    const daysPerWeek = userData.availableDaysPerWeek ?? 5;
    const hoursPerDay = userData.availableHoursPerDay ?? 2;
    let preferredStartTime = userData.preferredStartTime ?? DEFAULT_START_TIME;
    
    if (preferredStartTime.split(":").length === 2) {
        preferredStartTime += ":00";
    }

    const activeRoadmap = await db.query.roadmaps.findFirst({
        where: and(eq(roadmaps.userId, userId), eq(roadmaps.isActive, true)),
    });

    if (!activeRoadmap) return []; 

    const now = new Date();
    const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Today at 00:00:00
    const windowEnd = new Date(windowStart);
    windowEnd.setDate(windowStart.getDate() + 13); // +13 days = 14 days window

    const availableWeekdays = userData.availableWeekdays && userData.availableWeekdays.length > 0 
        ? userData.availableWeekdays 
        : (WEEKDAY_MAP[daysPerWeek] || WEEKDAY_MAP[5]);

    await db.delete(calendarEvents)
        .where(
            and(
                eq(calendarEvents.userId, userId),
                eq(calendarEvents.status, "scheduled")
            )
        );

    const unfinishedNodes = await db
        .select({
            id: roadmapNodes.id,
            estimatedDurationHours: skillCurriculumNodes.estimatedDurationHours,
            title: skillCurriculumNodes.title,
            description: skillCurriculumNodes.description,
        })
        .from(roadmapNodes)
        .innerJoin(skillCurriculumNodes, eq(roadmapNodes.curriculumNodeId, skillCurriculumNodes.id))
        .where(
            and(
                eq(roadmapNodes.roadmapId, activeRoadmap.id),
                inArray(roadmapNodes.status, ["pending", "inProgress"])
            )
        )
        .orderBy(asc(roadmapNodes.orderIndex));

    let candidateDates = [];
    for (let i = 0; i <= 13; i++) {
        const d = new Date(windowStart);
        d.setDate(windowStart.getDate() + i);
        if (availableWeekdays && availableWeekdays.includes(d.getDay())) {
            candidateDates.push(formatDate(d));
        }
    }

    const existingEvents = await db
        .select({
            roadmapNodeId: calendarEvents.roadmapNodeId,
            sessionIndex: calendarEvents.sessionIndex,
        })
        .from(calendarEvents)
        .where(
            and(
                eq(calendarEvents.userId, userId),
                unfinishedNodes.length > 0 ? inArray(calendarEvents.roadmapNodeId, unfinishedNodes.map(n => n.id)) : undefined
            )
        );

    const maxSessionIndexMap = new Map<string, number>();
    for (const e of existingEvents) {
        const current = maxSessionIndexMap.get(e.roadmapNodeId) || 0;
        if (e.sessionIndex > current) {
            maxSessionIndexMap.set(e.roadmapNodeId, e.sessionIndex);
        }
    }

    const eventsToCreate: typeof calendarEvents.$inferInsert[] = [];
    let dateIndex = 0;

    for (const node of unfinishedNodes) {
        const durationHours = node.estimatedDurationHours || 2;
        const sessionsNeeded = Math.ceil(durationHours / hoursPerDay);
        const startingSession = (maxSessionIndexMap.get(node.id) || 0) + 1;

        for (let sessionIndex = startingSession; sessionIndex <= sessionsNeeded; sessionIndex++) {
            if (dateIndex >= candidateDates.length) break;

            const date = candidateDates[dateIndex] || "";
            const endTimeStr = addHoursToTime(preferredStartTime, hoursPerDay);

            eventsToCreate.push({
                userId,
                roadmapNodeId: node.id,
                sessionIndex,
                totalSessionsForNode: sessionsNeeded,
                date,
                startTime: preferredStartTime,
                endTime: endTimeStr,
                status: "scheduled",
            });

            dateIndex++;
        }
        if (dateIndex >= candidateDates.length) break;
    }

    let insertedEvents: (typeof calendarEvents.$inferSelect)[] = [];
    if (eventsToCreate.length > 0) {
        insertedEvents = await db.insert(calendarEvents).values(eventsToCreate).returning();
    }

    const nodeMap = new Map(unfinishedNodes.map(n => [n.id, n]));

    return insertedEvents.map(event => ({
        event,
        nodeTitle: nodeMap.get(event.roadmapNodeId)?.title,
        nodeDescription: nodeMap.get(event.roadmapNodeId)?.description,
    }));
}
