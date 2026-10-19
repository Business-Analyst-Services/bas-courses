import type { Target } from "@/components/BulkEnrol";
import type { CohortStats } from "./admin";
import type { IntakeStats, Program } from "./programs";
import type { LoadedCourse } from "./types";

/** Options for the bulk-enrol "Enrol into" picker: open intakes, open cohorts, then courses. */
export function enrolTargets(intakes: IntakeStats[], cohorts: CohortStats[], courses: LoadedCourse[], programs: Program[]): Target[] {
  const open = (l: string) => l !== "delivered" && l !== "cancelled";
  const ptitle = (s: string) => programs.find((p) => p.slug === s)?.short_title || programs.find((p) => p.slug === s)?.title || s;
  return [
    ...intakes.filter((i) => open(i.lifecycle)).map((i) => ({ value: `intake:${i.id}`, label: `${i.name} (${ptitle(i.program_slug)} · ${i.participants}/${i.capacity})`, group: "Intakes (all courses in the program)" })),
    ...cohorts.filter((c) => open(c.lifecycle)).map((c) => ({ value: `cohort:${c.id}`, label: `${c.name} (${c.enrolled}/${c.capacity})`, group: "Cohorts (one course run)" })),
    ...courses.map((c) => ({ value: `course:${c.slug}`, label: c.shortTitle, group: "Course only (no cohort)" })),
  ];
}
