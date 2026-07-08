"use client";

import { Trash2Icon, BellIcon, BellOffIcon } from "lucide-react";
import { useState, useCallback } from "react";
import {
  CalendarProvider,
  CalendarDate,
  CalendarDatePicker,
  CalendarMonthPicker,
  CalendarYearPicker,
  CalendarDatePagination,
  CalendarHeader,
  useCalendarMonth,
  useCalendarYear,
} from "@/components/kibo-ui/calendar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useCurrentMonthDays,
  useToggleDay,
  useUpdateTimeSlots,
  useClearMonth,
  useStudyNotifications,
  useNotificationsEnabled,
} from "../service";
import { LearningCalendarBody } from "./learning-calendar-body";
import { TimeSlotEditor } from "./time-slot-editor";
import { ScheduleSummary } from "./schedule-summary";
import type { StudyDayData } from "../types";

type WeeklyLearningCalendarProps = {
  yearStart?: number;
  yearEnd?: number;
  locale?: Intl.LocalesArgument;
  startDay?: number;
};

function CalendarInner({
  yearStart = 2024,
  yearEnd = 2030,
  startDay = 0,
}: {
  yearStart?: number;
  yearEnd?: number;
  startDay?: number;
}) {
  const [month] = useCalendarMonth();
  const [year] = useCalendarYear();
  const days = useCurrentMonthDays(month, year);
  const toggleDay = useToggleDay();
  const updateTimeSlots = useUpdateTimeSlots();
  const clearMonth = useClearMonth();

  const [editorDay, setEditorDay] = useState<StudyDayData | null>(null);
  const [confirmDeleteDay, setConfirmDeleteDay] = useState<StudyDayData | null>(null);
  const [confirmClearMonth, setConfirmClearMonth] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [notificationsOn, setNotificationsOn] = useNotificationsEnabled();
  const { requestPermission, isSupported, permission } =
    useStudyNotifications(notificationsOn);

  const handleDayClick = (day: number) => {
    const existing = days.find((d) => d.day === day);
    setEditorDay(existing ?? { year, month, day, timeSlots: [] });
  };

  const handleEditSlots = (day: number) => {
    const studyDay = days.find((d) => d.day === day);
    if (studyDay) {
      setEditorDay(studyDay);
    }
  };

  const handleSaveSlots = (timeSlots: StudyDayData["timeSlots"]) => {
    if (!editorDay) return;
    const exists = days.some((d) => d.day === editorDay.day);

    if (exists && timeSlots.length === 0) {
      setConfirmDeleteDay(editorDay);
      setEditorDay(null);
      return;
    }

    if (!exists) {
      toggleDay(month, year, editorDay.day);
    }
    updateTimeSlots(month, year, editorDay.day, timeSlots);
    setEditorDay(null);
    if (!notificationsOn) {
      setShowNotifPrompt(true);
    }
  };

  const handleConfirmDelete = (confirmed: boolean) => {
    if (confirmed && confirmDeleteDay) {
      toggleDay(month, year, confirmDeleteDay.day);
    }
    setConfirmDeleteDay(null);
  };

  const handleNotifResponse = useCallback(
    (enable: boolean) => {
      if (!enable) {
        setShowNotifPrompt(false);
        return;
      }
      if (!isSupported) {
        setShowNotifPrompt(false);
        return;
      }
      if (permission === "denied") {
        setShowNotifPrompt(false);
        return;
      }
      const doEnable = async () => {
        if (permission === "default") {
          await requestPermission();
        }
        setNotificationsOn(true);
        setShowNotifPrompt(false);
      };
      doEnable();
    },
    [isSupported, permission, requestPermission]
  );

  const handleRemoveDay = (day: number) => {
    toggleDay(month, year, day);
  };

  const handleClear = () => {
    setConfirmClearMonth(true);
  };

  const handleConfirmClear = (confirmed: boolean) => {
    if (confirmed) {
      clearMonth(month, year);
    }
    setConfirmClearMonth(false);
  };

  const handleToggleNotifications = async () => {
    if (notificationsOn) {
      setNotificationsOn(false);
      return;
    }
    if (!isSupported) return;
    if (permission === "denied") return;
    if (permission === "default") {
      await requestPermission();
    }
    setNotificationsOn((prev) => !prev);
  };

  const editorStudyDay = editorDay
    ? days.find(
        (d) =>
          d.day === editorDay.day &&
          d.month === editorDay.month &&
          d.year === editorDay.year
      )
    : undefined;

  return (
    <>
      <CalendarDate>
        <CalendarDatePicker>
          <CalendarMonthPicker />
          <CalendarYearPicker start={yearStart} end={yearEnd} />
          <CalendarDatePagination />
        </CalendarDatePicker>
        {isSupported && (
          <Button
            variant={notificationsOn ? "default" : "outline"}
            size="sm"
            onClick={handleToggleNotifications}
            title={
              permission === "denied"
                ? "Notifications blocked in browser settings"
                : notificationsOn
                  ? "Disable reminders"
                  : "Enable study reminders"
            }
          >
            {notificationsOn ? (
              <BellIcon className="size-4" />
            ) : (
              <BellOffIcon className="size-4" />
            )}
            {notificationsOn ? "Reminders On" : "Reminders"}
          </Button>
        )}
        <Button
          variant="destructive-soft"
          size="sm"
          onClick={handleClear}
          disabled={days.length === 0}
        >
          <Trash2Icon className="size-4" />
          Clear Month
        </Button>
      </CalendarDate>

      <CalendarHeader />

      <LearningCalendarBody
        days={days}
        onDayClick={handleDayClick}
        onEditSlots={handleEditSlots}
        startDay={startDay}
      />

      <ScheduleSummary
        days={days}
        onEditDay={(d) => setEditorDay(d)}
        onRemoveDay={handleRemoveDay}
        month={month}
        year={year}
      />

      {editorDay && (
        <TimeSlotEditor
          open={!!editorDay}
          onOpenChange={(open) => {
            if (!open) setEditorDay(null);
          }}
          day={editorDay.day}
          month={month}
          year={year}
          timeSlots={editorStudyDay?.timeSlots ?? []}
          onSave={handleSaveSlots}
        />
      )}

      <Dialog
        open={showNotifPrompt}
        onOpenChange={(open) => {
          if (!open) setShowNotifPrompt(false);
        }}
      >
        <DialogContent className="sm:max-w-sm" role="alertdialog">
          <DialogHeader>
            <DialogTitle>Enable Study Reminders?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Would you like to receive notifications for your study sessions?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleNotifResponse(false)}>
              No
            </Button>
            <Button onClick={() => handleNotifResponse(true)}>
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!confirmDeleteDay}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteDay(null);
        }}
      >
        <DialogContent className="sm:max-w-sm" role="alertdialog">
          <DialogHeader>
            <DialogTitle>Delete Study Day?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            You're deleting this study day. Are you sure?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleConfirmDelete(false)}>
              No
            </Button>
            <Button variant="destructive" onClick={() => handleConfirmDelete(true)}>
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmClearMonth}
        onOpenChange={(open) => {
          if (!open) setConfirmClearMonth(false);
        }}
      >
        <DialogContent className="sm:max-w-sm" role="alertdialog">
          <DialogHeader>
            <DialogTitle>Clear Month?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Remove all study days for this month?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleConfirmClear(false)}>
              No
            </Button>
            <Button variant="destructive" onClick={() => handleConfirmClear(true)}>
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function WeeklyLearningCalendar({
  yearStart = 2024,
  yearEnd = 2030,
  locale = "en-US",
  startDay = 0,
}: WeeklyLearningCalendarProps) {
  return (
    <CalendarProvider locale={locale} startDay={startDay}>
      <Card>
        <CalendarInner yearStart={yearStart} yearEnd={yearEnd} startDay={startDay} />
      </Card>
    </CalendarProvider>
  );
}
