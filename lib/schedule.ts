import { cookies } from "next/headers";
import { getCourse } from "./courses";
import type { Course, Schedule } from "./types";

export const scheduleCookie = (slug: string) => `sched_${slug}`;

/** Apply a schedule: swap days and headline fields, and point each module at its day and time in that schedule. */
export function applySchedule(course: Course, id?: string): { course: Course; schedule?: Schedule } {
  const list = course.schedules;
  if (!list?.length) return { course };
  const schedule = list.find((s) => s.id === id) ?? list[0];
  const days = schedule.days ?? course.days;
  const where = new Map<string, { dayId: string; time: string }>();
  for (const d of days) for (const b of d.blocks) if (b.moduleId) where.set(b.moduleId, { dayId: d.id, time: b.time });
  return {
    schedule,
    course: {
      ...course,
      format: schedule.format ?? course.format,
      duration: schedule.duration ?? course.duration,
      delivery: schedule.delivery ?? course.delivery,
      days,
      modules: course.modules.map((m) => ({ ...m, ...(where.get(m.id) ?? {}) })),
    },
  };
}

/** Course as this viewer has chosen to see it (schedule held in a cookie per course). */
export async function getScheduledCourse(slug: string) {
  const base = getCourse(slug);
  if (!base) return { course: undefined, schedule: undefined };
  const jar = await cookies();
  return applySchedule(base, jar.get(scheduleCookie(slug))?.value);
}
