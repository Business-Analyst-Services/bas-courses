import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL!);

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS enrolments (
  email        TEXT NOT NULL,
  course_slug  TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('participant','presenter')),
  cohort       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (email, course_slug)
);
CREATE TABLE IF NOT EXISTS responses (
  user_id      TEXT NOT NULL,
  email        TEXT NOT NULL,
  course_slug  TEXT NOT NULL,
  activity_id  TEXT NOT NULL,
  prompt_id    TEXT NOT NULL,
  value        TEXT NOT NULL DEFAULT '',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_slug, activity_id, prompt_id)
);
CREATE TABLE IF NOT EXISTS progress (
  user_id      TEXT NOT NULL,
  email        TEXT NOT NULL,
  course_slug  TEXT NOT NULL,
  module_id    TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_slug, module_id)
);
CREATE TABLE IF NOT EXISTS quiz_answers (
  user_id      TEXT NOT NULL,
  course_slug  TEXT NOT NULL,
  module_id    TEXT NOT NULL,
  question     INT  NOT NULL,
  answer       INT  NOT NULL,
  correct      BOOLEAN NOT NULL,
  answered_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_slug, module_id, question)
);
`;

let ready: Promise<void> | null = null;
/** Creates tables on first use, so a fresh Neon database works with no manual migration. */
export function ensureSchema() {
  if (!ready) {
    ready = (async () => {
      for (const stmt of SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)) {
        await sql.query(stmt);
      }
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}
