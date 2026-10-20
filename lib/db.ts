import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL!);

// Idempotent schema: safe to run on every cold start.
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS enrolments (
  email        TEXT NOT NULL,
  course_slug  TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('participant','presenter')),
  cohort       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (email, course_slug)
);
ALTER TABLE enrolments ADD COLUMN IF NOT EXISTS cohort_id INT;
ALTER TABLE enrolments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
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
ALTER TABLE quiz_answers ADD COLUMN IF NOT EXISTS email TEXT;
CREATE TABLE IF NOT EXISTS course_settings (
  slug           TEXT PRIMARY KEY,
  status         TEXT NOT NULL DEFAULT 'published',
  sort           INT,
  catalogue      BOOLEAN NOT NULL DEFAULT true,
  show_outline   BOOLEAN NOT NULL DEFAULT true,
  show_resources BOOLEAN NOT NULL DEFAULT true,
  show_ai        BOOLEAN NOT NULL DEFAULT true,
  show_quiz      BOOLEAN NOT NULL DEFAULT true,
  show_roster    BOOLEAN NOT NULL DEFAULT true,
  hidden_modules TEXT[] NOT NULL DEFAULT '{}',
  title          TEXT,
  short_title    TEXT,
  tagline        TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS custom_courses (
  slug        TEXT PRIMARY KEY,
  body        JSONB NOT NULL,
  updated_by  TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cohorts (
  id              SERIAL PRIMARY KEY,
  course_slug     TEXT NOT NULL,
  name            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'scheduled',
  start_date      DATE,
  end_date        DATE,
  capacity        INT NOT NULL DEFAULT 20,
  forecast_seats  INT NOT NULL DEFAULT 0,
  price           NUMERIC(10,2),
  delivery        TEXT,
  presenter_email TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS attendance (
  cohort_id   INT  NOT NULL,
  email       TEXT NOT NULL,
  module_id   TEXT NOT NULL,
  present     BOOLEAN NOT NULL,
  marked_by   TEXT,
  marked_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cohort_id, email, module_id)
);
CREATE TABLE IF NOT EXISTS feedback (
  user_id      TEXT NOT NULL,
  email        TEXT NOT NULL,
  course_slug  TEXT NOT NULL,
  cohort_id    INT,
  question_id  TEXT NOT NULL,
  score        INT,
  text         TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_slug, question_id)
);
CREATE TABLE IF NOT EXISTS improvement_backlog (
  id           SERIAL PRIMARY KEY,
  course_slug  TEXT NOT NULL,
  cohort_id    INT,
  key          TEXT,
  title        TEXT NOT NULL,
  detail       TEXT,
  area         TEXT,
  modules      TEXT,
  source       TEXT NOT NULL DEFAULT 'manual',
  evidence     TEXT,
  priority     TEXT NOT NULL DEFAULT 'medium',
  status       TEXT NOT NULL DEFAULT 'new',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS improvement_backlog_key ON improvement_backlog (cohort_id, key);
CREATE TABLE IF NOT EXISTS cohort_reviews (
  cohort_id    INT PRIMARY KEY,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by TEXT,
  summary      JSONB
);
CREATE TABLE IF NOT EXISTS clients (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  contact_email TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS programs (
  slug         TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  short_title  TEXT,
  description  TEXT,
  course_slugs TEXT[] NOT NULL DEFAULT '{}',
  gap_days     INT NOT NULL DEFAULT 7,
  status       TEXT NOT NULL DEFAULT 'published',
  price        NUMERIC(10,2),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS intakes (
  id              SERIAL PRIMARY KEY,
  program_slug    TEXT NOT NULL,
  client_id       INT,
  name            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'scheduled',
  start_date      DATE,
  capacity        INT NOT NULL DEFAULT 20,
  forecast_seats  INT NOT NULL DEFAULT 0,
  price           NUMERIC(10,2),
  delivery        TEXT,
  presenter_email TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS intake_id INT;
ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS client_id INT;
CREATE TABLE IF NOT EXISTS course_versions (
  slug         TEXT NOT NULL,
  version      INT  NOT NULL,
  label        TEXT,
  notes        TEXT,
  body         JSONB NOT NULL,
  created_by   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  PRIMARY KEY (slug, version)
);
ALTER TABLE course_settings ADD COLUMN IF NOT EXISTS live_version INT NOT NULL DEFAULT 0;
ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS course_version INT;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS course_versions JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE IF NOT EXISTS people (
  email       TEXT PRIMARY KEY,
  first_name  TEXT,
  last_name   TEXT,
  company     TEXT,
  linkedin    TEXT,
  source      TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS humanitix_event_id TEXT;
ALTER TABLE intakes ADD COLUMN IF NOT EXISTS humanitix_event_id TEXT;
CREATE TABLE IF NOT EXISTS external_tickets (
  source      TEXT NOT NULL,
  ticket_key  TEXT NOT NULL,
  event_id    TEXT,
  email       TEXT,
  target      TEXT,
  status      TEXT NOT NULL,
  checked_in  BOOLEAN NOT NULL DEFAULT false,
  seen_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (source, ticket_key)
);
CREATE TABLE IF NOT EXISTS import_log (
  id        SERIAL PRIMARY KEY,
  source    TEXT NOT NULL,
  run_by    TEXT,
  run_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  summary   JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS app_flags (
  key        TEXT PRIMARY KEY,
  set_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

let ready: Promise<void> | null = null;
/** Creates/updates tables on first use, so a fresh Neon database works with no manual migration. */
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
