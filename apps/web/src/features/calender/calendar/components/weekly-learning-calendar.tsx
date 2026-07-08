"use client";

import { Trash2Icon, BellIcon, BellOffIcon } from "lucide-react";
import { useState } from "react";
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
  useCurrentMonthDays,
  useToggleDay,
  useUpdateTimeSlots,
  useClearMonth,
  useStudyNotifications,
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
  const [notificationsOn, setNotificationsOn] = useState(false);
  const { requestPermission, isSupported, permission } =
    useStudyNotifications(notificationsOn);

  const handleDayClick = (day: number) => {
    toggleDay(month, year, day);
  };

  const handleEditSlots = (day: number) => {
    const studyDay = days.find((d) => d.day === day);
    if (studyDay) {
      setEditorDay(studyDay);
    }
  };

  const handleSaveSlots = (timeSlots: StudyDayData["timeSlots"]) => {
    if (!editorDay) return;
    updateTimeSlots(month, year, editorDay.day, timeSlots);
  };

  const handleRemoveDay = (day: number) => {
    toggleDay(month, year, day);
  };

  const handleClear = () => {
    clearMonth(month, year);
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
