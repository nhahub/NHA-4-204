"use client";

import { atomWithStorage } from "jotai/utils";
import { useAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import type { StudyDayData, TimeSlot } from "./types";

const studyScheduleAtom = atomWithStorage<StudyDayData[]>(
  "kibo-study-schedule",
  []
);

export function useStudySchedule() {
  return useAtom(studyScheduleAtom);
}

export function useCurrentMonthDays(month: number, year: number) {
  const [schedule] = useAtom(studyScheduleAtom);
  return schedule.filter(
    (d) => d.month === month && d.year === year
  );
}

export function useToggleDay() {
  const [, setSchedule] = useAtom(studyScheduleAtom);

  const toggleDay = useCallback(
    (month: number, year: number, day: number) => {
      setSchedule((prev) => {
        const index = prev.findIndex(
          (d) => d.year === year && d.month === month && d.day === day
        );
        if (index >= 0) {
          return prev.filter((_, i) => i !== index);
        }
        return [...prev, { year, month, day, timeSlots: [] }];
      });
    },
    [setSchedule]
  );

  return toggleDay;
}

export function useUpdateTimeSlots() {
  const [, setSchedule] = useAtom(studyScheduleAtom);

  const updateTimeSlots = useCallback(
    (month: number, year: number, day: number, timeSlots: TimeSlot[]) => {
      setSchedule((prev) => {
        const index = prev.findIndex(
          (d) => d.year === year && d.month === month && d.day === day
        );
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = { ...updated[index], timeSlots };
          return updated;
        }
        return prev;
      });
    },
    [setSchedule]
  );

  return updateTimeSlots;
}

export function useClearMonth() {
  const [, setSchedule] = useAtom(studyScheduleAtom);

  const clearMonth = useCallback((month: number, year: number) => {
    setSchedule((prev) =>
      prev.filter((d) => !(d.month === month && d.year === year))
    );
  }, [setSchedule]);

  return clearMonth;
}

export function useStudyNotifications(enabled: boolean) {
  const [schedule] = useAtom(studyScheduleAtom);
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) {
      notifiedRef.current.clear();
      return;
    }

    if (typeof Notification === "undefined") return;

    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      if (Notification.permission !== "granted") return;

      const now = new Date();
      const todayMonth = now.getMonth();
      const todayYear = now.getFullYear();
      const todayDay = now.getDate();

      const todayStudy = schedule.find(
        (d) =>
          d.year === todayYear && d.month === todayMonth && d.day === todayDay
      );

      if (!todayStudy) return;

      for (const slot of todayStudy.timeSlots) {
        const [h, m] = slot.start.split(":").map(Number);
        if (now.getHours() === h && now.getMinutes() === m) {
          const key = `${todayDay}-${slot.start}`;
          if (!notifiedRef.current.has(key)) {
            notifiedRef.current.add(key);
            new Notification("Study Time!", {
              body: `Time to study: ${slot.start} - ${slot.end}`,
            });
          }
        }
      }
    }, 30_000);

    return () => {
      clearInterval(interval);
    };
  }, [schedule, enabled]);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "denied" as NotificationPermission;
    return Notification.requestPermission();
  }, []);

  return {
    requestPermission,
    permission: typeof Notification !== "undefined" ? Notification.permission : "denied",
    isSupported: typeof Notification !== "undefined",
  };
}
