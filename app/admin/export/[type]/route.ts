import { requireAdmin } from "@/lib/access";
import { ensureSchema, sql } from "@/lib/db";
import { getAllCourses } from "@/lib/courses";
import { getCohortStats } from "@/lib/admin";

const csv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => { const s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
};

export async function GET(_r: Request, { params }: { params: Promise<{ type: string }> }) {
  await requireAdmin();
  await ensureSchema();
  const type = (await params).type;
  let rows: Record<string, unknown>[] = [];
  if (type === "enrolments") rows = (await sql`SELECT e.email, e.course_slug, e.role, e.status, c.name AS cohort, e.created_at FROM enrolments e LEFT JOIN cohorts c ON c.id = e.cohort_id ORDER BY 2, 1`) as Record<string, unknown>[];
  else if (type === "attendance") rows = (await sql`SELECT c.name AS cohort, c.course_slug, a.email, a.module_id, a.present, a.marked_by, a.marked_at FROM attendance a JOIN cohorts c ON c.id = a.cohort_id ORDER BY 1, 3, 4`) as Record<string, unknown>[];
  else if (type === "progress") rows = (await sql`SELECT email, course_slug, module_id, completed_at FROM progress ORDER BY 2, 1, 3`) as Record<string, unknown>[];
  else if (type === "quiz") rows = (await sql`SELECT email, course_slug, module_id, question, answer, correct, answered_at FROM quiz_answers ORDER BY 2, 1, 3, 4`) as Record<string, unknown>[];
  else if (type === "cohorts") {
    const courses = await getAllCourses();
    rows = (await getCohortStats(Object.fromEntries(courses.map((c) => [c.slug, c.modules.length])))).map((c) => ({
      cohort: c.name, course: c.course_slug, lifecycle: c.lifecycle, start: c.start_date, end: c.end_date, capacity: c.capacity,
      enrolled: c.enrolled, waitlist: c.waitlist, forecast_seats: c.forecast_seats, price: c.price,
      attendance_rate: c.attendanceRate?.toFixed(3), completion_rate: c.completionRate?.toFixed(3), quiz_rate: c.quizRate?.toFixed(3),
      presenter: c.presenter_email, delivery: c.delivery,
    }));
  } else return new Response("Unknown export", { status: 404 });
  return new Response(csv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="bas-${type}-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
