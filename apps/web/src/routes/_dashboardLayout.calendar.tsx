import { WeeklyLearningCalendar } from "@/features/calender/calendar";

export default function DashboardCalendarRoute() {
  return (
    <div className="py-8">
      <h1 className="mb-6 text-2xl font-bold">Weekly Learning Calendar</h1>
      <WeeklyLearningCalendar />
    </div>
  );
}
