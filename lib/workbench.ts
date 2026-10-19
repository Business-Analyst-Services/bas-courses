/** Courses that include the interactive Delivery Workbench page. */
export const WORKBENCH_COURSES = new Set(["horizons-delivery"]);
export const hasWorkbench = (slug: string) => WORKBENCH_COURSES.has(slug) || slug.startsWith("horizons-delivery");
