# FreshMate AI — AI Campus Assistant

A hackathon project: an AI-powered campus assistant that reads your **timetable** and **academic planner** (PDF or image), tells you what classes you have today, alerts you about upcoming exams, and predicts how a holiday break affects your attendance percentage. Includes **QR-based attendance** and **email/password authentication**.

Built with **Vite + React + TypeScript** frontend and an **Express + MySQL** backend, using **Google Gemini** to parse uploaded documents.

## Architecture

```
project/
├── src/                 # Vite React frontend
│   ├── pages/           # Landing, Auth, Dashboard, Timetable, Planner, Holidays, Attendance
│   ├── components/      # Shell (sidebar+logout), UI primitives
│   ├── lib/             # api client (JWT), auth context, date utils
│   └── types/           # shared TS types
└── server/              # Express + MySQL backend
    ├── routes/          # auth, documents, holidays, attendance
    ├── db.js            # mysql2 pool + schema auto-init (incl. users table)
    ├── gemini.js        # Gemini parsing (text + image/PDF inlineData)
    ├── middleware.js    # multer upload + JWT auth guard
    └── index.js         # Express app entry
```

## Prerequisites (on your laptop)

1. **Node.js 18+**
2. **MySQL** running locally (e.g. `mysql -u root -p` works)
3. A **Google Gemini API key** — get one at https://aistudio.google.com/apikey

## Setup

### 1. Backend

```bash
cd server
cp .env.example .env
# Edit server/.env:
#   MYSQL_PASSWORD=<your_mysql_password>
#   GEMINI_API_KEY=<your_gemini_api_key>
#   JWT_SECRET=<a long random string>
npm install
npm start
```

The server listens on `http://localhost:8800` and auto-creates the `freshmate_ai` database + tables (including users) on first run.

### 2. Frontend

From the project root (a new terminal):

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). The frontend proxies `/api/*` to the backend automatically.

## Features

- **Landing page** — FreshMate AI hero with tagline and Get Started button.
- **Authentication** — split-screen login/register with poster on the left, form on the right. JWT-based, stored in localStorage.
- **Dashboard** — today's classes, upcoming exams (next 14 days), overall attendance %.
- **Timetable** — upload a PDF or photo of your class schedule; Gemini extracts each slot (day, time, subject, room).
- **Academic Planner** — upload a syllabus / exam schedule; Gemini extracts exams, assignments, deadlines, and holidays.
- **Holidays & Attendance Impact** — pick a date range (e.g. Monday→Wednesday holidays) and see:
  - How many classes you'd skip (per subject)
  - Your attendance % if the holidays are official (classes removed from denominator)
  - Your attendance % if treated as absent
  - A plain-English recommendation
- **QR Attendance** — three tabs:
  - **Summary**: overall + per-subject attendance %
  - **Teacher**: generate a 5-minute QR session for a subject, see live list of marked students
  - **Student**: enter ID + name, scan the teacher's QR with the device camera, get marked present (double-marking blocked)
- **AI Assistant** — chat with Gemini grounded in your live timetable, upcoming exams, holidays, and attendance %. Ask things like "Can I skip class tomorrow?" and get an answer based on your actual data, not guesses. Chat history persists between visits. Uses an automatic model-fallback chain (see "Gemini model notes" below) so it keeps working as Google retires older model IDs.
- **Lost & Found** — post a lost or found item with a description, location, and contact info; browse/filter the board; mark items resolved.
- **Senior Connect** — browse a directory of senior student mentors by department/expertise and send a connect request with your contact info and a short message.
- **Campus Navigation** — search/filter saved campus locations (buildings, classrooms, hostels, faculty cabins, etc.), see each one on a live Google Map, and get one-tap Directions. Uses Google's key-less embed/link URLs (`maps.google.com/maps?...&output=embed` and `google.com/maps/dir/?api=1&destination=...`) — **no Google Maps API key, billing account, or setup required.**
- **Placement Hub** — browse company drives (package, deadline, required skills, eligibility), apply and track application status, and upload a resume for an instant Gemini-powered ATS review (score gauge, detected skills, missing sections, skill gaps, strengths, suggestions). Companies are ranked against your most recent resume's detected skills. *(Mock interview, certificates, and career roadmap from the original spec aren't built yet — happy to add them next if useful.)*

## Gemini model notes

Google retires Gemini model IDs frequently (gemini-1.5-* is fully shut down; 2.0-* shut down June 2026; 2.5-flash is being phased out ahead of its official date). Rather than hardcoding one model string, `server/gemini.js` tries a fallback chain (`GEMINI_MODEL` env override → `gemini-flash-latest` → `gemini-3.5-flash` → `gemini-2.5-flash` → `gemini-2.0-flash`) and remembers whichever one actually works for your API key. If you see a 404 "model not found" error, set `GEMINI_MODEL` in `server/.env` to a model your key currently supports.

## API (backend)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register `{name, email, password}` → `{token, user}` |
| POST | `/api/auth/login` | Login `{email, password}` → `{token, user}` |
| POST | `/api/timetable/upload` | Upload timetable PDF/image (multipart `file`) |
| GET | `/api/timetable` | All timetable slots |
| GET | `/api/timetable/today` | Today's slots |
| POST | `/api/planner/upload` | Upload academic planner PDF/image |
| GET | `/api/planner` | Upcoming academic events |
| GET | `/api/planner/upcoming-exams` | Exams in next 14 days |
| DELETE | `/api/planner/:id` | Delete an academic event |
| GET | `/api/holidays` | List holidays |
| POST | `/api/holidays` | Add a holiday `{holiday_date, reason}` |
| DELETE | `/api/holidays/:id` | Delete a holiday |
| GET | `/api/holidays/impact?start_date=&end_date=` | Attendance impact for a range |
| POST | `/api/attendance/session` | Create QR session `{subject}` |
| GET | `/api/attendance/session/:id` | Get session + QR image |
| POST | `/api/attendance/mark` | Mark attendance `{token, student_id, student_name}` |
| GET | `/api/attendance/summary` | Per-subject + overall attendance |
| GET | `/api/attendance/records/:sessionId` | Records for a session |
| POST | `/api/assistant/chat` | Chat with the AI assistant `{message, history}` → `{reply}` |
| GET | `/api/assistant/history` | Recent chat history |
| DELETE | `/api/assistant/history` | Clear chat history |
| GET | `/api/lost-found?item_type=&status=` | List lost/found posts |
| POST | `/api/lost-found` | Post an item `{item_type, title, description, location, contact_name, contact_info}` |
| PUT | `/api/lost-found/:id/status` | Mark resolved/reopened `{status}` |
| DELETE | `/api/lost-found/:id` | Delete a post |
| GET | `/api/mentors?department=` | List mentors |
| POST | `/api/mentors/:id/connect` | Request to connect `{requester_name, requester_contact, message}` |
| GET | `/api/mentors/connections?requester_contact=` | Check your connection request status |
| GET | `/api/campus-locations?type=&q=` | List/search campus locations |
| POST | `/api/campus-locations` | Add a location `{name, location_type, building_name, floor, room_number, latitude, longitude, description}` |
| DELETE | `/api/campus-locations/:id` | Delete a location |
| GET | `/api/placements?status=&q=` | List/search company drives |
| GET | `/api/placements/recommended?student_contact=` | Companies ranked by skill match to your resume |
| POST | `/api/placements` | Post a company drive `{name, role, package_lpa, required_skills, eligibility, deadline, description}` |
| PUT | `/api/placements/:id/status` | Open/close a posting `{status}` |
| DELETE | `/api/placements/:id` | Delete a posting |
| POST | `/api/placements/apply` | Apply `{company_id, student_name, student_contact}` |
| GET | `/api/placements/status?student_contact=` | Your application statuses |
| POST | `/api/resume/upload` | Upload resume (multipart `file`, + `student_name`, `student_contact`, optional `target_skills`) → Gemini ATS analysis |
| GET | `/api/resume/history?student_contact=` | Your past resume uploads + scores |

## Demo flow (for judges)

1. Start MySQL, backend, and frontend.
2. **Landing page** → click Get Started → **Register** a new account (or login).
3. **Upload your real timetable PDF** → Dashboard shows today's classes.
4. **Upload your academic planner** → Dashboard shows upcoming exams; Holidays page shows extracted holidays.
5. On Holidays page, pick Mon→Wed range → see attendance impact + recommendation.
6. On Attendance page (Teacher tab) → generate QR for a subject.
7. On another device / browser tab (Student tab) → enter ID + name → scan the QR → "Marked present".
8. Back to Teacher tab → refresh → student appears. Summary tab shows the %.

## Notes

- The Gemini calls use `gemini-1.5-flash` with inline data for images and PDFs.
- The MySQL schema is auto-created on server start (no manual SQL needed).
- QR tokens expire after 5 minutes; double-marking the same student in one session is blocked.
- JWT auth: all `/api/*` routes except `/api/auth/*` require a `Bearer` token.
