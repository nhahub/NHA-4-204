export type TimeSlot = {
  start: string;
  end: string;
};

export type StudyDayData = {
  year: number;
  month: number;
  day: number;
  timeSlots: TimeSlot[];
};
