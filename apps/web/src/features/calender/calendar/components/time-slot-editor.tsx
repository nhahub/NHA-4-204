"use client";

import { XIcon, PlusIcon, AlertCircleIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type { TimeSlot } from "../types";

type TimeSlotEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: number;
  month: number;
  year: number;
  timeSlots: TimeSlot[];
  onSave: (timeSlots: TimeSlot[]) => void;
};

function isTimeBefore(a: string, b: string) {
  return a.localeCompare(b) < 0;
}

export function TimeSlotEditor({
  open,
  onOpenChange,
  day,
  month,
  year,
  timeSlots: initialSlots,
  onSave,
}: TimeSlotEditorProps) {
  const now = useMemo(() => new Date(), []);
  const isToday =
    year === now.getFullYear() &&
    month === now.getMonth() &&
    day === now.getDate();

  const currentTimeStr = useMemo(
    () =>
      `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    [now]
  );

  const nextHourStart = useMemo(() => {
    const d = new Date(now);
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }, [now]);

  const nextHourEnd = useMemo(() => {
    const d = new Date(now);
    d.setHours(d.getHours() + 2, 0, 0, 0);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }, [now]);

  const [slots, setSlots] = useState<TimeSlot[]>(initialSlots);

  const errors = useMemo(() => {
    const errs: { endBeforeStart?: boolean; duplicate?: boolean; pastTime?: boolean }[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const key = `${slot.start}-${slot.end}`;
      const endBeforeStart = !isTimeBefore(slot.start, slot.end);
      const duplicate = seen.has(key);
      const pastTime = isToday && slot.start < currentTimeStr;
      seen.add(key);
      errs.push({ endBeforeStart, duplicate, pastTime });
    }
    return errs;
  }, [slots, isToday, currentTimeStr]);

  const hasErrors = errors.some((e) => e.endBeforeStart || e.duplicate || e.pastTime);
  const isNewDay = initialSlots.length === 0;
  const cannotSave = hasErrors || (isNewDay && slots.length === 0);

  const addSlot = () => {
    if (isToday) {
      setSlots((prev) => [...prev, { start: nextHourStart, end: nextHourEnd }]);
    } else {
      setSlots((prev) => [...prev, { start: "09:00", end: "10:00" }]);
    }
  };

  const removeSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSlot = (
    index: number,
    field: "start" | "end",
    value: string
  ) => {
    setSlots((prev) =>
      prev.map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot
      )
    );
  };

  const handleSave = () => {
    if (cannotSave) return;
    onSave(slots);
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSlots(initialSlots);
    }
    onOpenChange(next);
  };

  const dateLabel = new Date(year, month, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Study Times for {dateLabel}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {slots.length === 0 && (
            <p className="py-2 text-center text-muted-foreground text-sm">
              No study times set. Add a time slot below.
            </p>
          )}
          {slots.map((slot, index) => {
            const error = errors[index];
            return (
              <div key={index}>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={slot.start}
                    onChange={(e) =>
                      updateSlot(index, "start", e.target.value)
                    }
                    className={cn(
                      "w-32",
                      error?.endBeforeStart && "border-destructive"
                    )}
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={slot.end}
                    onChange={(e) =>
                      updateSlot(index, "end", e.target.value)
                    }
                    className={cn(
                      "w-32",
                      error?.endBeforeStart && "border-destructive"
                    )}
                  />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeSlot(index)}
                    aria-label="Remove time slot"
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>
                {error?.endBeforeStart && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircleIcon className="size-3" />
                    End time must be after start time
                  </p>
                )}
                {error?.duplicate && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircleIcon className="size-3" />
                    Duplicate time slot
                  </p>
                )}
                {error?.pastTime && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircleIcon className="size-3" />
                    Start time must be in the future
                  </p>
                )}
              </div>
            );
          })}
          <Button variant="outline" size="sm" onClick={addSlot}>
            <PlusIcon className="size-4" />
            Add Time Slot
          </Button>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button onClick={handleSave} disabled={cannotSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
