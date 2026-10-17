# BAS Course Portal

Login-gated course site for Business Analyst Services. One site, every course, with a course switcher.
Each person is enrolled per course as a **participant** or a **presenter**.

| Course | Slug | Format |
|---|---|---|
| BA Playbooks (Playbooks in a Day) | `ba-playbooks` | 1 day |
| BA Leadership | `ba-leadership` | 2 days |
| Agile Business Analysis | `agile-ba` | 2 days |
| Horizons: Strategy / Initiative / Delivery | `horizons-*` | 1 day each (Horizon Series) |
| Practical AI for End-to-End BA (flagship) | `practical-ai` | 6 weeks, 12 sessions |

**Stack:** Next.js 15 (App Router) on Vercel · Clerk (login) · Neon Postgres (enrolments, workbook answers, progress, quiz results) · GitHub (source; every push deploys).

## What people see
- **Participants:** agenda, session pages (big idea, teaching content, worked WorkSafe Victoria example, workbook activities that save to Neon, paste-ready AI prompts, knowledge checks), downloads, progress.
- **Presenters:** everything above, plus a Participant/Presenter toggle on every session (opening line, minute-by-minute beats, role-play persona and curveball, facilitation notes, what good looks like, debrief, answer keys) and a **roster** showing progress and every participant's activity answers.
- **Admins** (emails in `ADMIN_EMAILS`): presenter access to every course, and `/admin` to enrol people by email.

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
