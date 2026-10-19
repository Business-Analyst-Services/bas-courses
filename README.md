# BAS Course Portal

Login-gated course site for Business Analyst Services. One site, every course, with a course switcher.
Each person is enrolled per course as a **participant** or a **presenter**.

| Course | Slug | Format |
|---|---|---|
| BA Playbooks (Playbooks in a Day) | `ba-playbooks` | 1 day |
| BA Leadership | `ba-leadership` | 2 days |
| Agile Business Analysis | `agile-ba` | 2 days |
| Horizons: Strategy / Initiative / Delivery | `horizons-*` | 1 day each (Horizon Series) |
| Practical AI for End-to-End BA (flagship) | `practical-ai` | 12 × 2-hour sessions: 12 weeks (default) or 6-week intensive, switchable from the course menu |

**Stack:** Next.js 15 (App Router) on Vercel · Clerk (login) · Neon Postgres (enrolments, workbook answers, progress, quiz results) · GitHub (source; every push deploys).

## What people see
- **Participants:** agenda, session pages (big idea, teaching content, an industry worked example, workbook activities that save to Neon, paste-ready AI prompts, knowledge checks), downloads, progress.
- **Presenters:** everything above, plus a Participant/Presenter toggle on every session (opening line, minute-by-minute beats, role-play persona and curveball, facilitation notes, what good looks like, debrief, answer keys) and a **roster** showing progress and every participant's activity answers.
- **Present on screen:** presenters get a full-screen slide view of every session (`/c/<slug>/m/<id>/present`) built from the session content — teaching sections with diagrams, activities, quiz questions with answer reveal, debrief and takeaways — with private presenter notes (N), full screen (F) and a copy-link button.
- **Feedback:** each course has a 10-question feedback form (`feedback` in the course JSON: 7 ratings, 1 likelihood-to-recommend, 2 open questions). Participants only ever see their own answers; presenters see anonymised results.
- **Admins** (emails in `ADMIN_EMAILS`): presenter access to every course, plus `/admin`:
  - **Dashboard:** running, upcoming, forecast and delivered cohorts, seat fill, attendance, completion, quiz averages, booked revenue.
  - **Programs:** bundle courses in order (the Horizon Series is created automatically). Typing course titles that don't exist yet creates them as hidden drafts. Participants get a program home page at `/p/<slug>`.
  - **Intakes:** plan one or many runs of a program at once (start date, gap between courses, repeat every N weeks). A cohort is created for every course automatically. Enrolling someone into an intake places them in every cohort, and capacity counts people across the intake.
  - **Clients:** group intakes and cohorts by organisation. A client is created automatically when you type a new name.
  - **Courses:** status (published, hidden or archived), per-course menu toggles (outline, resources, AI prompts, quizzes, roster, catalogue), hide individual sessions, title and tagline overrides, sort order. Add courses by importing JSON (validated), downloading the template, exporting or duplicating an existing course.
  - **Cohorts:** bulk-create cohorts for several courses on a repeating cadence, or add them one at a time.
  - **Cohort details:** dates, capacity, forecast seats, price, delivery and lead presenter. Status is worked out from the dates. Each cohort has a roster, waitlist and attendance grid.
  - **Enrolments:** paste a list, one person per line: `email[, presenter][, intake/cohort/course]`.
  - **Enrolment management:** bulk enrol into a cohort (over capacity goes to the waitlist) or straight into a course; filter, give a waitlisted person a seat, remove.
  - **Reports:** by course and by cohort, with a date range; CSV exports for cohorts, enrolments, attendance, completion and quiz answers.
- **Presenters** mark attendance per cohort and session on the course Roster page.

## Editing content
All course content is in `content/courses/<slug>.json` (schema in `lib/types.ts`). Edit, run `npm run validate`, commit, push. Vercel redeploys.
Downloads live in `private/files/<slug>/` and are served only to enrolled users at `/files/<slug>/<file>`.

## Environment variables
See `.env.example`: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`, `DATABASE_URL`, `ADMIN_EMAILS`.
Tables are created automatically on the first request (or run `npm run db:setup`).

## Local dev
```
npm install
cp .env.example .env.local   # fill in keys
npm run dev
```
