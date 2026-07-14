"use client";

import { RefreshCwIcon, CalendarDaysIcon, SparklesIcon, SaveIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useUserInfo,
  useActiveRole,
  useCalendarEvents,
  useGenerateCalendar,
  useUpdateEvent,
  useSetAvailability,
} from "../service";
import { CalendarSetup } from "./calendar-setup";
import { LearningCalendarBody } from "./learning-calendar-body";
import { TimeSlotEditor } from "./time-slot-editor";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMemo } from "react";

const timeToMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export function CalendarInner() {
  const [month] = useCalendarMonth();
  const [year] = useCalendarYear();

  const { data: userInfo, isLoading: userLoading } = useUserInfo();
  const { data: activeRole, isLoading: roleLoading } = useActiveRole();
  const hasAvailability = !!(userInfo?.availableDaysPerWeek && userInfo?.availableHoursPerDay);

  const [needsSetup, setNeedsSetup] = useState(false);
  const [viewMode, setViewMode] = useState<"week" | "month">("week");

  const {
    data: calendarData,
    isLoading: eventsLoading,
    refetch: refetchEvents,
  } = useCalendarEvents(month, year);

  const generateCalendar = useGenerateCalendar();
  const updateEvent = useUpdateEvent();

  const [selectedDayEvents, setSelectedDayEvents] = useState<any[] | null>(null);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [editingTimes, setEditingTimes] = useState<Record<string, { startTime: string; endTime: string }>>({});
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editDays, setEditDays] = useState(userInfo?.availableDaysPerWeek ?? 5);
  const [editHours, setEditHours] = useState(userInfo?.availableHoursPerDay ?? 2);
  const { mutate: mutateAvailability, isPending: isSavingAvailability } = useSetAvailability();

  useEffect(() => {
    if (userInfo) {
      setEditDays(userInfo.availableDaysPerWeek ?? 5);
      setEditHours(userInfo.availableHoursPerDay ?? 2);
    }
  }, [userInfo]);

  const handleSaveSettings = () => {
    mutateAvailability(
      { availableDaysPerWeek: editDays, availableHoursPerDay: editHours },
      {
        onSuccess: () => {
          setIsSettingsOpen(false);
          toast.success("Schedule preferences saved.");
          handleRegenerate(); // Regenerate schedule to respect new limits
        },
        onError: () => {
          toast.error("Failed to save preferences.");
        }
      }
    );
  };

  useEffect(() => {
    if (selectedDayEvents) {
      const initialTimes: Record<string, { startTime: string; endTime: string }> = {};
      selectedDayEvents.forEach((ev: any) => {
        initialTimes[ev.event.id] = { startTime: ev.event.startTime.slice(0, 5), endTime: ev.event.endTime.slice(0, 5) };
      });
      setEditingTimes(initialTimes);
    }
  }, [selectedDayEvents]);

  const handleBatchSaveTimes = async () => {
    if (!selectedDayEvents) return;
    
    for (const ev of selectedDayEvents) {
      if (ev.event.status !== "scheduled") continue;
      const times = editingTimes[ev.event.id];
      if (!times) continue;
      if (timeToMinutes(times.endTime) <= timeToMinutes(times.startTime)) {
        toast.error("End time must be after start time for all sessions.");
        return;
      }
    }

    try {
      for (const ev of selectedDayEvents) {
        if (ev.event.status !== "scheduled") continue;
        const times = editingTimes[ev.event.id];
        if (times && (times.startTime !== ev.event.startTime.slice(0, 5) || times.endTime !== ev.event.endTime.slice(0, 5))) {
          await updateEvent.mutateAsync({
            eventId: ev.event.id,
            startTime: times.startTime + ":00",
            endTime: times.endTime + ":00"
          });
        }
      }
      toast.success("Sessions updated successfully!");
      setSelectedDayEvents(null);
      refetchEvents();
    } catch (err) {
      toast.error("Failed to update sessions.");
    }
  };

  const weekDates = useMemo(() => {
    if (!editingEvent?.event?.date) return [];
    const date = new Date(editingEvent.event.date + "T00:00:00");
    const day = date.getDay(); // 0 is Sunday
    const start = new Date(date);
    start.setDate(date.getDate() - day);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  }, [editingEvent?.event?.date]);

  const handleSetupComplete = () => {
    setNeedsSetup(false);
    refetchEvents();
  };

  const handleDayClick = (day: number) => {
    if (!calendarData?.events) return;
    const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayEvents = calendarData.events.filter((e: any) => e.event.date === dayStr);
    if (dayEvents.length > 0) {
      setSelectedDayEvents(dayEvents);
    }
  };

  const handleMarkStatus = (eventId: string, status: "completed" | "scheduled" | "skipped") => {
    updateEvent.mutate({ eventId, status });
  };

  const handleEditEvent = (eventWithDetails: any) => {
    setEditingEvent(eventWithDetails);
    setSelectedDayEvents(null);
  };

  const handleSaveTimeSlots = (eventId: string, date: string, startTime: string, endTime: string) => {
    updateEvent.mutate({ eventId, date, startTime, endTime });
    setEditingEvent(null);
  };

  const handleRegenerate = () => {
    generateCalendar.mutate(undefined, {
      onSuccess: () => refetchEvents(),
    });
  };

  if (userLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <RefreshCwIcon className="size-5 animate-spin" />
      </div>
    );
  }

  if (!hasAvailability || needsSetup) {
    return <CalendarSetup onComplete={handleSetupComplete} />;
  }

  if (!activeRole) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <CalendarDaysIcon className="size-12 text-muted-foreground/40" />
        <div>
          <h3 className="font-medium">No active roadmap</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete your onboarding to set a career goal and generate a study plan.
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.href = "/onboarding"}>
          Go to Onboarding
        </Button>
      </div>
    );
  }

  const needsNewSchedule = calendarData?.needsNewSchedule ?? false;

  return (
    <div className="flex flex-col h-full w-full">
      <CalendarDate>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-4">
          <CalendarDatePicker>
            <CalendarMonthPicker />
            <CalendarYearPicker start={2024} end={2030} />
            <CalendarDatePagination />
          </CalendarDatePicker>
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="week" className="text-xs px-3 py-1">Week</TabsTrigger>
                <TabsTrigger value="month" className="text-xs px-3 py-1">Month</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
            >
              Edit Preferences
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={generateCalendar.isPending}
            >
              <RefreshCwIcon className={`size-4 ${generateCalendar.isPending ? "animate-spin" : ""}`} />
              Regenerate
            </Button>
          </div>
        </div>
      </CalendarDate>

      <CalendarHeader />

      <LearningCalendarBody
        events={calendarData?.events ?? []}
        onDayClick={handleDayClick}
        viewMode={viewMode}
        onEventDrop={(eventId, date) => {
          const events = calendarData?.events ?? [];
          const droppedEvent = events.find(e => e.event.id === eventId);
          if (!droppedEvent) return;

          const todayStr = new Date().toISOString().split("T")[0];
          const targetDateObj = new Date(date);
          const todayObj = new Date(todayStr);
          const twoWeeksFromToday = new Date(todayObj.getTime() + 14 * 24 * 60 * 60 * 1000);
          
          if (targetDateObj < todayObj || targetDateObj > twoWeeksFromToday) {
            toast.error("You can only reschedule events within the upcoming 2 weeks.", { position: "top-center" });
            return;
          }

          const targetDayEvents = events.filter(e => e.event.date === date && e.event.id !== eventId);
          const currentDayMinutes = targetDayEvents.reduce((acc, e) => acc + timeToMinutes(e.event.endTime) - timeToMinutes(e.event.startTime), 0);
          const droppedEventMinutes = timeToMinutes(droppedEvent.event.endTime) - timeToMinutes(droppedEvent.event.startTime);
          const availableHours = (calendarData as any)?.availableHoursPerDay ?? 2;
          const totalHours = (currentDayMinutes + droppedEventMinutes) / 60;
          
          if (totalHours > availableHours + 0.01) {
            toast.error(`Cannot exceed daily limit of ${availableHours}h. This would make it ${totalHours.toFixed(1)}h.`, { position: "top-center" });
            return;
          }

          const currentIndex = events.findIndex(e => e.event.id === eventId);
          if (currentIndex !== -1) {
            const prevEvent = events[currentIndex - 1];
            const nextEvent = events[currentIndex + 1];
            
            if (prevEvent && new Date(date) < new Date(prevEvent.event.date)) {
              toast.error("You cannot move this event before its prerequisite.", { position: "top-center" });
              return;
            }
            if (nextEvent && new Date(date) > new Date(nextEvent.event.date)) {
              toast.error("You cannot move this event past its next dependent event.", { position: "top-center" });
              return;
            }
          }
          updateEvent.mutate({ eventId, date });
        }}
      />

      {needsNewSchedule && (
        <div className="flex items-center justify-center gap-2 border-t p-4">
          <SparklesIcon className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            No upcoming schedule.{' '}
            <button
              onClick={handleRegenerate}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Generate one
            </button>
          </span>
        </div>
      )}

      <Dialog
        open={!!selectedDayEvents}
        onOpenChange={(open) => {
          if (!open) setSelectedDayEvents(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDayEvents?.[0]?.event.date
                ? new Date(selectedDayEvents[0].event.date + "T00:00:00").toLocaleDateString(
                    "en-US",
                    { weekday: "long", month: "long", day: "numeric" }
                  )
                : ""}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            <div className="flex flex-col gap-3">
              {selectedDayEvents?.map(({ event, nodeTitle }: any) => (
                <div
                  key={event.id}
                  className="flex flex-col gap-2 rounded-lg border p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{nodeTitle}</p>
                      {event.status === "scheduled" ? (
                         <div className="flex items-center gap-2 mt-1">
                           <Input 
                             type="time" 
                             className="h-7 text-xs px-2 w-24"
                             value={editingTimes[event.id]?.startTime ?? ""}
                             onChange={(e) => setEditingTimes(prev => ({ ...prev, [event.id]: { ...prev[event.id], startTime: e.target.value } }))}
                           />
                           <span className="text-muted-foreground">-</span>
                           <Input 
                             type="time" 
                             className="h-7 text-xs px-2 w-24"
                             value={editingTimes[event.id]?.endTime ?? ""}
                             onChange={(e) => setEditingTimes(prev => ({ ...prev, [event.id]: { ...prev[event.id], endTime: e.target.value } }))}
                           />
                         </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {event.startTime.slice(0, 5)} - {event.endTime.slice(0, 5)}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        event.status === "completed"
                          ? "bg-primary/20 text-primary"
                          : event.status === "skipped"
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>
                  {event.status === "scheduled" && (
                    <div className="flex gap-2">
                      <Button
                        size="xs"
                        variant="default"
                        onClick={() => handleMarkStatus(event.id, "completed")}
                      >
                        Complete
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => handleMarkStatus(event.id, "skipped")}
                      >
                        Skip
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter className="flex sm:justify-between items-center w-full gap-2 mt-4">
            <DialogClose render={<Button variant="outline" className="w-full sm:w-auto" />}>
              Close
            </DialogClose>
            {selectedDayEvents?.some((e: any) => e.event.status === "scheduled") && (
               <Button onClick={handleBatchSaveTimes} className="w-full sm:w-auto">
                 <SaveIcon className="size-4 mr-2" /> Save Times
               </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingEvent && (
        <TimeSlotEditor
          open={!!editingEvent}
          onOpenChange={(open) => {
            if (!open) setEditingEvent(null);
          }}
          event={editingEvent.event}
          maxHours={userInfo?.availableHoursPerDay ?? 2}
          weekDates={weekDates}
          onSave={handleSaveTimeSlots}
        />
      )}

      {/* Settings Modal */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Schedule Preferences</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Days per week</label>
              <Input 
                type="number" 
                min={1} max={7} 
                value={editDays} 
                onChange={e => setEditDays(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Hours per day</label>
              <Input 
                type="number" 
                min={1} max={24} 
                value={editHours} 
                onChange={e => setEditHours(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveSettings} disabled={isSavingAvailability}>
              {isSavingAvailability ? "Saving..." : "Save Preferences"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function WeeklyLearningCalendar() {
  return (
    <div className="w-full flex-1 flex flex-col">
      <CalendarProvider locale="en-US" startDay={0}>
        <Card className="flex-1 flex flex-col">
          <CalendarInner />
        </Card>
      </CalendarProvider>
    </div>
  );
}
