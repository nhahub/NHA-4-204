"use client";

import { getDay, getDaysInMonth, startOfDay } from "date-fns";
import { useMemo } from "react";
import {
  useCalendarMonth,
  useCalendarYear,
} from "@/components/kibo-ui/calendar";
import { cn } from "@/lib/utils";
import type { CalendarEventWithDetails } from "../types";

type LearningCalendarBodyProps = {
  events: CalendarEventWithDetails[];
  onDayClick: (day: number) => void;
  startDay?: number;
  viewMode?: "week" | "month";
  onEventDrop?: (eventId: string, targetDate: string) => void;
};

export function LearningCalendarBody({
  events,
  onDayClick,
  startDay = 0,
  viewMode = "month",
  onEventDrop,
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

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEventWithDetails[]>();
    for (const ev of events) {
      const date = ev.event.date;
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(ev);
    }
    return map;
  }, [events]);

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

    if (viewMode === "week") {
      const todayDay = new Date().getDate();
      const isCurrentMonth = month === new Date().getMonth() && year === new Date().getFullYear();
      const targetDay = isCurrentMonth ? todayDay : 1;
      
      const targetIndex = nodes.findIndex((n) => n.type === "current" && n.day === targetDay);
      if (targetIndex !== -1) {
        const weekStart = Math.floor(targetIndex / 7) * 7;
        return nodes.slice(weekStart, weekStart + 7);
      }
      return nodes.slice(0, 7);
    }

    return nodes;
  }, [firstDay, daysInMonth, prevMonthData, nextMonthData, viewMode, month, year]);

  return (
    <div className="grid flex-grow grid-cols-7 auto-rows-[1fr] text-[10px] sm:text-xs">
      {dayNodes.map((node, index) => {
        const isPrevMonth = node.type === "prev";
        const isNextMonth = node.type === "next";
        const targetMonth = isPrevMonth ? (month === 0 ? 11 : month - 1) : isNextMonth ? (month === 11 ? 0 : month + 1) : month;
        const targetYear = isPrevMonth ? (month === 0 ? year - 1 : year) : isNextMonth ? (month === 11 ? year + 1 : year) : year;
        const fullDateString = `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(node.day).padStart(2, "0")}`;
        
        const dayEvents = eventsByDate.get(fullDateString);
        const hasEvents = !!dayEvents && dayEvents.length > 0;
        const isPastDay = startOfDay(new Date(targetYear, targetMonth, node.day)) < today;

        return (
          <div
            key={`${fullDateString}-${index}`}
            className={cn(
              "relative min-h-[70px] overflow-hidden border-t border-e cursor-pointer transition-colors p-0.5 sm:p-1 group",
              node.type !== "current" && "bg-secondary text-muted-foreground",
              isPastDay && "opacity-60",
              hasEvents && node.type === "current" && "bg-primary/5",
              !hasEvents && node.type === "current" && "hover:bg-muted"
            )}
            style={{
              borderInlineEnd: index % 7 === 6 ? "none" : undefined,
            }}
            onClick={() => {
               if(node.type === "current") onDayClick(node.day);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add("bg-primary/20");
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove("bg-primary/20");
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove("bg-primary/20");
              const eventId = e.dataTransfer.getData("text/plain");
              if (eventId && onEventDrop) {
                onEventDrop(eventId, fullDateString);
              }
            }}
          >
            <div className="flex items-start justify-between">
              <span
                className={cn(
                  "text-xs leading-none",
                  hasEvents && node.type === "current" && !isPastDay
                    ? "font-medium text-primary"
                    : (node.type !== "current" || isPastDay) ? "text-muted-foreground" : ""
                )}
              >
                {node.day}
              </span>
              {hasEvents && (
                <span className="mt-0.5 block h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </div>
            {hasEvents && (
              <div className="mt-1 flex flex-col gap-1">
                {dayEvents!.slice(0, 3).map((ev) => (
                  <div
                    key={ev.event.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", ev.event.id);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDayClick(parseInt(ev.event.date.split('-')[2], 10));
                    }}
                    className={cn(
                      "truncate rounded px-1.5 py-0.5 text-[10px] cursor-grab active:cursor-grabbing",
                      ev.event.status === "completed" ? "bg-primary/20 text-primary" : 
                      ev.event.status === "skipped" ? "bg-muted text-muted-foreground" : 
                      "bg-primary text-primary-foreground"
                    )}
                    title={ev.nodeTitle}
                  >
                    {ev.nodeTitle}
                  </div>
                ))}
                {dayEvents!.length > 3 && (
                  <div className="text-[10px] text-muted-foreground font-medium px-1">
                    +{dayEvents!.length - 3} more
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
