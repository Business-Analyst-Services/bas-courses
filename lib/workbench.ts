/** Courses that include the interactive Workbench page. */
export const WORKBENCH_COURSES = new Set(["horizons-initiative"]);
export const hasWorkbench = (slug: string) => WORKBENCH_COURSES.has(slug);
