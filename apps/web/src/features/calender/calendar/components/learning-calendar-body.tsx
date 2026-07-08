"use client";

import { getDay, getDaysInMonth, startOfDay } from "date-fns";
import { useMemo } from "react";
import { ClockIcon, PencilIcon } from "lucide-react";
import {
  useCalendarMonth,
  useCalendarYear,
} from "@/components/kibo-ui/calendar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { StudyDayData } from "../types";

type LearningCalendarBodyProps = {
  days: StudyDayData[];
  onDayClick: (day: number) => void;
  onEditSlots: (day: number) => void;
  startDay?: number;
};

export function LearningCalendarBody({
  days,
  onDayClick,
  onEditSlots,
  startDay = 0,
}: LearningCalendarBodyProps) {
  const [month] = useCalendarMonth();
  const [year] = useCalendarYear();
  const today = startOfDay(new Date());

  const currentMonthDate = useMemo(
    () => new Date(year, month, 1),
    [year, month]
  );
  const daysInMonth = useMemo(
    () => getDaysInMonth(currentMonthDate),
    [currentMonthDate]
  );
  const firstDay = useMemo(
    () => (getDay(currentMonthDate) - startDay + 7) % 7,
    [currentMonthDate, startDay]
  );

  const prevMonthData = useMemo(() => {
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevMonthYear = month === 0 ? year - 1 : year;
    const prevMonthDays = getDaysInMonth(
      new Date(prevMonthYear, prevMonth, 1)
    );
    const prevMonthDaysArray = Array.from(
      { length: prevMonthDays },
      (_, i) => i + 1
    );
    return { prevMonthDays, prevMonthDaysArray };
  }, [month, year]);

  const nextMonthData = useMemo(() => {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextMonthYear = month === 11 ? year + 1 : year;
    const nextMonthDays = getDaysInMonth(
      new Date(nextMonthYear, nextMonth, 1)
    );
    const nextMonthDaysArray = Array.from(
      { length: nextMonthDays },
      (_, i) => i + 1
    );
    return { nextMonthDaysArray };
  }, [month, year]);

  const daysSet = useMemo(() => {
    const map = new Map<number, StudyDayData>();
    for (const d of days) {
      map.set(d.day, d);
    }
    return map;
  }, [days]);

  const dayNodes = useMemo(() => {
    const nodes: {
      day: number;
      type: "prev" | "current" | "next";
    }[] = [];

    for (let i = 0; i < firstDay; i++) {
      const day =
        prevMonthData.prevMonthDaysArray[
          prevMonthData.prevMonthDays - firstDay + i
        ];
      if (day) {
        nodes.push({ day, type: "prev" });
      }
    }

    for (let day = 1; day <= daysInMonth; day++) {
      nodes.push({ day, type: "current" });
    }

    const remainingDays = 7 - ((firstDay + daysInMonth) % 7);
    if (remainingDays < 7) {
      for (let i = 0; i < remainingDays; i++) {
        const day = nextMonthData.nextMonthDaysArray[i];
        if (day) {
          nodes.push({ day, type: "next" });
        }
      }
    }

    return nodes;
  }, [
    firstDay,
    daysInMonth,
    prevMonthData,
    nextMonthData,
  ]);

  return (
    <div className="grid flex-grow grid-cols-7 text-[10px] sm:text-xs">
      {dayNodes.map((node, index) => {
        const isSelected = node.type === "current" && daysSet.has(node.day);
        const studyDay = isSelected ? daysSet.get(node.day) : undefined;
        const isPastDay =
          node.type === "current" &&
          startOfDay(new Date(year, month, node.day)) < today;

        if (isPastDay) {
          return (
            <div
              key={node.day}
              className="relative aspect-square overflow-hidden border-t border-e bg-secondary p-0.5 sm:p-1"
              style={{
                borderInlineEnd: index % 7 === 6 ? "none" : undefined,
              }}
            >
              <div className="flex items-start justify-between">
                <span className="text-xs leading-none text-muted-foreground">
                  {node.day}
                </span>
                {isSelected && (
                  <span className="mt-0.5 block h-1.5 w-1.5 rounded-full bg-blue-500" />
                )}
              </div>
              {studyDay && studyDay.timeSlots.length > 0 && (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground leading-tight">
                  <ClockIcon className="size-2.5 shrink-0" />
                  <span>
                    {studyDay.timeSlots.length === 1
                      ? `${studyDay.timeSlots[0].start}-${studyDay.timeSlots[0].end}`
                      : `${studyDay.timeSlots.length} slots`}
                  </span>
                </div>
              )}
            </div>
          );
        }

        if (node.type !== "current") {
          return (
            <div
              key={`${node.type}-${index}`}
              className="relative aspect-square overflow-hidden border-t border-e bg-secondary p-0.5 sm:p-1 text-muted-foreground text-xs"
              style={{
                borderInlineEnd: index % 7 === 6 ? "none" : undefined,
              }}
            >
              {node.day}
            </div>
          );
        }

        return (
          <div
            key={node.day}
            className={cn(
              "relative aspect-square overflow-hidden border-t border-e cursor-pointer transition-colors p-0.5 sm:p-1",
              isSelected && "bg-blue-50 dark:bg-blue-950/40",
              !isSelected && "hover:bg-muted"
            )}
            style={{
              borderInlineEnd: index % 7 === 6 ? "none" : undefined,
            }}
            onClick={() => onDayClick(node.day)}
          >
            <div className="flex items-start justify-between">
              <span
                className={cn(
                  "text-xs leading-none",
                  isSelected
                    ? "font-medium text-blue-600 dark:text-blue-400"
                    : "text-muted-foreground"
                )}
              >
                {node.day}
              </span>
              {isSelected && (
                <span className="mt-0.5 block h-1.5 w-1.5 rounded-full bg-blue-500" />
              )}
              {studyDay && studyDay.timeSlots.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditSlots(node.day);
                  }}
                  aria-label="Edit time slots"
                >
                  <PencilIcon className="size-3" />
                </Button>
              )}
            </div>
            {studyDay && (
              <div className="mt-1 flex flex-col gap-0.5">
                {studyDay.timeSlots.length > 0 ? (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground leading-tight">
                    <ClockIcon className="size-2.5 shrink-0" />
                    <span>
                      {studyDay.timeSlots.length === 1
                        ? `${studyDay.timeSlots[0].start}-${studyDay.timeSlots[0].end}`
                        : `${studyDay.timeSlots.length} slots`}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] text-blue-400 dark:text-blue-500">
                    Add time
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
