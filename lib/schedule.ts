import { cookies } from "next/headers";
import { getCourse } from "./courses";
import type { Course, Schedule } from "./types";

export const scheduleCookie = (slug: string) => `sched_${slug}`;

/** Apply a schedule: swap days and headline fields, and point each module at its day and time in that schedule. */
export function applySchedule<T extends Course>(course: T, id?: string): { course: T; schedule?: Schedule } {
  const list = course.schedules;
  if (!list?.length) return { course };
  const schedule = list.find((s) => s.id === id) ?? list[0];
  // Keep only agenda blocks whose session is visible to this viewer (hidden sessions are already removed from modules).
  const visible = new Set(course.modules.map((m) => m.id));
  const days = (schedule.days ?? course.days).map((d) => ({ ...d, blocks: d.blocks.filter((b) => !b.moduleId || visible.has(b.moduleId)) }));
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

/** Apply the viewer's chosen schedule (held in a cookie per course). */
export async function withSchedule<T extends Course>(course: T) {
  const jar = await cookies();
  return applySchedule(course, jar.get(scheduleCookie(course.slug))?.value);
}

/** Course as this viewer has chosen to see it. */
export async function getScheduledCourse(slug: string) {
  const base = await getCourse(slug);
  if (!base) return { course: undefined, schedule: undefined };
  return withSchedule(base);
}
