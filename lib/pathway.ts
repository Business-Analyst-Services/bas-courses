import type { Course, Pathway } from "./types";

/** The pathway choice is saved as a workbook response so presenters see it on the roster. */
export const PATHWAY_ACTIVITY = "__pathway";
export const PATHWAY_PROMPT = "choice";

export function chosenPathway(course: Course, responses: Record<string, string>): Pathway | undefined {
  const id = responses[`${PATHWAY_ACTIVITY}::${PATHWAY_PROMPT}`];
  return course.pathways?.find((p) => p.id === id);
}
