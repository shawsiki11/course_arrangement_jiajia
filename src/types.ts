export interface PreferredSlot {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // "HH:mm"
}

export interface Course {
  id: string;
  name: string;
  grade: string;
  type: '在线' | '面授';
  totalSections: number;
  remainingSections: number;
  duration: number; // in hours (e.g., 1, 1.5, 2)
  color: string;
  preferredSlots?: PreferredSlot[];
  recurrence?: 'none' | 'daily' | 'weekly';
}

export interface ScheduledSlot {
  id: string;
  courseId: string;
  date: Date;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
}

export const COURSE_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];
