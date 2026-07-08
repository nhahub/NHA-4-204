"use client";

import { ClockIcon, PencilIcon, XIcon } from "lucide-react";
import type { StudyDayData } from "../types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ScheduleSummaryProps = {
  days: StudyDayData[];
  onEditDay: (day: StudyDayData) => void;
  onRemoveDay: (day: number) => void;
  month: number;
  year: number;
};

export function ScheduleSummary({
  days,
  onEditDay,
  onRemoveDay,
  month,
  year,
}: ScheduleSummaryProps) {
  if (days.length === 0) {
    return (
      <div className="border-t border-border p-4 text-center text-muted-foreground text-sm">
        No study days selected. Click on a day to add it.
      </div>
    );
  }

  const sorted = [...days].sort((a, b) => a.day - b.day);

  return (
    <div className="border-t border-border">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
          Study Days ({days.length})
        </span>
      </div>
      <div className="flex flex-wrap gap-2 p-4 pt-2">
        {sorted.map((d) => (
          <div
            key={d.day}
            className={cn(
              "group flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
            )}
          >
            <span>
              {new Date(year, month, d.day).toLocaleDateString("en-US", {
                weekday: "short",
                day: "numeric",
              })}
            </span>
            {d.timeSlots.length > 0 && (
              <span className="flex items-center gap-0.5 text-muted-foreground">
                <ClockIcon className="size-3" />
                {d.timeSlots
                  .map((s) => `${s.start}-${s.end}`)
                  .join(", ")}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onEditDay(d)}
              aria-label="Edit time slots"
              className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            >
              <PencilIcon className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onRemoveDay(d.day)}
              aria-label="Remove study day"
              className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            >
              <XIcon className="size-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
