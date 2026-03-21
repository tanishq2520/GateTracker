# GATE CS STUDY TRACKER — MASTER PROMPT v2
### Clean, Minimal, Honest Study Tool | React + Firebase | No Gamification

---

> **HOW TO USE THIS PROMPT:**
> Paste this entire document to an AI coding agent (Antigravity, Cursor, Windsurf, etc.) and say:
> *"Build this web application exactly as described. Follow every section in order. Do not skip anything."*

---

## PROJECT OVERVIEW

Build a **GATE CS Study Tracker** — a clean, minimal web tool that helps a student preparing for GATE CS track what they planned, what they actually did, and how much is left. The app is completely empty at first launch. The user defines everything: subjects, units, topics, lectures per day, test dates, revision dates, off days. The app's only job is to reflect their plan back to them honestly and show how much remains.

**Design Philosophy:**
- Clean and minimal. No clutter. One clear thing to do on each screen.
- Everything starts empty. User fills it in. App does not assume anything.
- Progress is only updated when the user explicitly marks something done — and only for today or future days. Past days cannot be retroactively marked complete. What was missed is missed. That's the point.
- No gamification. No XP, no badges, no streaks, no celebrations. Just honest data.
- Every field is editable. Plans change — the app adapts.

**Stack:**
- Frontend: React (Vite), TailwindCSS, Recharts (for graphs)
- Database: Firebase Firestore (real-time, cross-device)
- Auth: Firebase Anonymous Auth (no signup needed)
- Hosting: Firebase Hosting or Vercel
- Local fallback: localStorage cache for offline use

---

## SECTION 1 — SUBJECTS (Pre-loaded list, but starts empty/unconfigured)

The app comes with these GATE CS subjects pre-listed in the Subjects setup screen.
Every field is blank/zero until the user fills it in. Nothing is assumed.

Pre-loaded subject names with colors (user can edit name, color, or add/remove subjects):
```
Data Structures         #4F46E5
Algorithms              #7C3AED
Operating Systems       #DB2777
DBMS                    #D97706
Computer Networks       #059669
Theory of Computation   #DC2626
Compiler Design         #EA580C
Computer Organization   #0891B2
Discrete Mathematics    #6366F1
Linear Algebra          #BE185D
Probability & Stats     #15803D
Calculus                #B45309
Programming in C        #0369A1
Digital Logic           #7E22CE
General Aptitude        #65A30D
```

Each subject document (once user configures it) holds:
```
name, color
totalUnits         (e.g., 6)
unitsBreakdown[]   (array: each unit has name, topicCount, lecturesNeeded)
lecturesPerDay     (e.g., 2 per day)
plannedStartDate
plannedEndDate     (calculated or manually set)
completedUnits     (number — incremented only when user marks unit done)
completedTopics    (running count)
status             "not_started" | "in_progress" | "completed"
completedOn        null or actual date (set only when all units marked done)
revisionSessions[] (each: { date, notes, done: true/false })
pyqDays            (number of Previous Year Questions days planned)
testDays           (number of subject tests planned)
notes              free text
```

---

## SECTION 2 — FIREBASE SETUP (WITH FULL DEVELOPER COMMENTS IN CODE)

```javascript
// ============================================================
// FIREBASE SETUP — FOLLOW THESE STEPS EXACTLY
// ============================================================
//
// STEP 1: Go to https://console.firebase.google.com
//         Click "Add Project" → name it "gate-cs-tracker"
//         Disable Google Analytics → Create Project
//
// STEP 2: Register a Web App
//         Click the </> icon on project home page
//         Name it "gate-tracker-web"
//         Check "Enable Firebase Hosting"
//         Click "Register App"
//         COPY the firebaseConfig object shown — you'll need it below
//
// STEP 3: Set up Firestore Database
//         In left sidebar → Build → Firestore Database
//         Click "Create Database"
//         Choose "Start in TEST MODE" (good for development)
//         Region: asia-south1 (Mumbai — closest to India)
//
// STEP 4: Enable Anonymous Auth
//         In left sidebar → Build → Authentication
//         Click "Get Started" → Sign-in method tab
//         Enable "Anonymous" → Save
//         This ties data to the browser without any login
//
// STEP 5: Install Firebase in project
//         Run: npm install firebase
//
// STEP 6: Paste your firebaseConfig below in /src/firebase/config.js
//
// STEP 7 (When going live — change Firestore security rules):
//   rules_version = '2';
//   service cloud.firestore {
//     match /databases/{database}/documents {
//       match /users/{userId}/{document=**} {
//         allow read, write: if request.auth != null
//                           && request.auth.uid == userId;
//       }
//     }
//   }
//
// STEP 8: To enable Google Sign-In (so you can use across devices):
//   - Firebase Console → Authentication → Sign-in method → Enable Google
//   - In code, use: linkWithPopup(auth.currentUser, new GoogleAuthProvider())
//   - This merges your anonymous data with your Google account
//   - After this, sign in with Google on any device to access same data
//
// STEP 9: Deploy to Firebase Hosting:
//   npm install -g firebase-tools
//   firebase login
//   firebase init  (select Hosting + Firestore, build dir = "dist")
//   npm run build
//   firebase deploy
// ============================================================

// File: /src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  // PASTE YOUR CONFIG FROM FIREBASE CONSOLE HERE:
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Offline persistence — app works without internet, syncs when back online
enableIndexedDbPersistence(db).catch(console.warn);

// Auto anonymous sign-in
export const initAuth = () => new Promise((resolve) => {
  onAuthStateChanged(auth, (user) => {
    if (user) resolve(user);
    else signInAnonymously(auth).then(cred => resolve(cred.user));
  });
});
```

---

## SECTION 3 — FIRESTORE DATA SCHEMA

```
users/{uid}/
  goals/main                  → GATE exam date, daily target hours
  subjects/{subjectId}        → per-subject plan + progress
  calendarEvents/{eventId}    → all events (study days, tests, revisions, off days, sem exams)
  mockTests/{testId}          → mock test records
  dailyLogs/{YYYY-MM-DD}      → what was actually done each day (ONLY logged by user for TODAY)
  settings/preferences        → app settings

// ── GOALS ────────────────────────────────────────────────────
// users/{uid}/goals/main
{
  gateExamDate: Timestamp,
  dailyHourTarget: 5,
  startDate: Timestamp,
  targetScore: 65
}

// ── SUBJECT ──────────────────────────────────────────────────
// users/{uid}/subjects/{subjectId}
{
  name: "DBMS",
  color: "#D97706",
  totalUnits: 6,
  units: [
    {
      id: "u1",
      name: "ER Model & Relational Model",
      totalTopics: 8,
      lecturesNeeded: 4,
      done: false,
      doneOn: null      // set to actual date when user marks done (only present/future)
    },
    { id: "u2", name: "SQL", totalTopics: 10, lecturesNeeded: 5, done: false, doneOn: null },
    // ... more units
  ],
  lecturesPerDay: 2,
  plannedStartDate: Timestamp,
  plannedEndDate: Timestamp,
  pyqDaysPlanned: 5,
  testDaysPlanned: 3,
  revisionDaysPlanned: 2,
  revisionSessions: [
    { id: "r1", plannedDate: Timestamp, done: false, doneOn: null, notes: "" }
  ],
  notes: "",
  status: "not_started",   // auto-computed: not_started / in_progress / completed
  completedOn: null
}

// ── CALENDAR EVENT ────────────────────────────────────────────
// users/{uid}/calendarEvents/{eventId}
// These are all manually planned by the user. No auto-generation.
{
  date: "2025-08-15",         // YYYY-MM-DD
  type: "study" | "revision" | "mock_test" | "pyq" | "sem_exam" | "leave" | "buffer" | "subject_test",
  subjectId: "dbms",          // null if not subject-specific
  label: "DBMS - SQL Unit",   // short description shown on calendar
  color: "#D97706",           // inherited from subject or custom
  done: false,                // CANNOT be set to true for past dates
  notes: ""
}

// ── MOCK TEST ─────────────────────────────────────────────────
// users/{uid}/mockTests/{testId}
{
  date: Timestamp,
  testName: "Mock 3",
  platform: "GATE Overflow",
  scored: 62,
  totalMarks: 100,
  percentile: null,
  subjectBreakdown: {
    "dbms": { attempted: 4, correct: 3, marks: 6 }
  },
  notes: "Weak in transactions"
}

// ── DAILY LOG ─────────────────────────────────────────────────
// users/{uid}/dailyLogs/{YYYY-MM-DD}
// CRITICAL RULE: This document can only be written for today's date.
// The app must enforce: if (selectedDate !== today) → block write, show message.
{
  date: "2025-08-15",
  hoursStudied: 4,
  subjectsWorkedOn: ["dbms", "ds"],
  unitsMarkedDone: ["dbms_u2"],    // which units were completed today
  notes: "Finished SQL. Understood joins well.",
  eventIdsCompleted: ["eventId1"]  // which calendar events were completed today
}
```

---

## SECTION 4 — THE NO BACKDATING RULE (Critical Implementation Detail)

**This is the most important integrity rule in the entire app.**

When a user tries to mark anything as "done" (a unit, a calendar event, a revision session):
1. Check: is the planned date in the past (before today)?
2. If YES → **do not allow marking it done**. Show a clear, non-judgmental message:

   > "This was planned for [date]. That day has passed. It counts as missed — you can't go back and mark it done.
   > What you can do: add a make-up event for today or a future date."

3. If the date is TODAY or in the FUTURE → allow marking done normally.

This means:
- Past missed days are permanently visible as "missed" (gray/red on calendar)
- The user cannot clean up their history to feel better
- Progress % only reflects what was actually done on time
- This is the whole point — honest tracking, not feel-good tracking

**Implement this check in every write path:**
- markUnitDone()
- markEventDone()
- markRevisionDone()
- submitDailyLog()

---

## SECTION 5 — APP PAGES & NAVIGATION

**Simple sidebar with 5 items only:**
```
📊  Dashboard
📅  Calendar
📚  Subjects
🧪  Mock Tests
⚙️  Settings
```

No achievements page. No gamification page. Keep it focused.

---

## SECTION 6 — DASHBOARD PAGE

The first screen the user sees every day. Must answer three questions instantly:
1. How much total is done?
2. What should I do today?
3. Am I on track?

### 6.1 Top Bar — Exam Countdown

A clean horizontal bar across the top:
```
GATE 2026 — 278 days left    |    Today: Saturday, March 21    |    Prep Day 87
```
- If exam date not set: show "Set your GATE exam date in Settings" with a link

### 6.2 Today's Snapshot Card

The most prominent card. Shows:
- What is planned for today (from calendarEvents for today's date)
- If nothing is planned: "Nothing scheduled today. Go to Calendar to plan."
- A "Log Today's Study" button → opens today's log form (only available for TODAY)
- If already logged: shows what was logged with an Edit button (editable same day only)

### 6.3 Overall Progress Bar

One wide progress bar showing:
- X% of total syllabus completed (weighted by totalTopics per subject)
- Below it: "X units done out of Y total units across all subjects"

### 6.4 Subject Progress Strip

A compact horizontal list of all configured subjects:
```
[Subject name]  [████████░░░░]  60% — 4/6 units  [Planned end: Aug 15]  [Status badge]
```
- Status badge: gray = Not Started, blue = In Progress, green = Completed, orange = Overdue
- A subject is "Overdue" if plannedEndDate has passed and status is not completed
- Click any row → goes to that subject's detail page

### 6.5 Global Calendar (Full width — most important visual on dashboard)

A full-width, month-navigable calendar showing the entire GATE prep journey from today until GATE exam date (up to Jan/Feb 2027). This is the "big picture" the user wants.

**Calendar cells:**
Each day cell shows:
- A small colored dot or tag per event on that day
- Day number

**Color coding (shown as a legend below the calendar):**
- 🟦 Blue — Study day (subject-specific, shows subject color)
- 🟣 Purple — Revision day
- 🟠 Orange — Mock test day
- 🔴 Red — Subject test / PYQ day
- ⬛ Dark gray — Sem exam / blocked day
- 🟡 Yellow — Buffer / free day
- ✅ Green fill — Day completed (logged and done)
- ❌ Red X — Day missed (past, not completed, no log)
- ⬜ White — Future unplanned day

**Calendar behavior:**
- Navigate month by month with prev/next arrows
- Click any FUTURE day → opens "Add/Edit Event" modal for that day
- Click TODAY → opens "Log Today" modal
- Click any PAST day → shows read-only summary of what was planned vs what happened (no editing)
- Show a "Jump to GATE date" button that scrolls/navigates to exam month

**New color: Shifted (light orange outline)** — events that were originally planned for an earlier date but got cascade-shifted forward. This lets the user see at a glance which parts of their calendar are "living on borrowed time."

**Year-at-a-glance toggle:**
A toggle button "Month View / Full Journey View" — when switched to Full Journey:
- Shows all months from today to GATE exam date stacked vertically
- Each month is compact (small cells, just colored dots)
- Lets user see their entire remaining journey at once
- Scroll to navigate

### 6.6 Upcoming Events (Next 14 Days)

A simple list below the calendar:
```
Mar 22  DBMS — ER Model (Study)        🟦
Mar 23  DBMS — SQL Unit (Study)        🟦
Mar 26  Data Structures — Revision     🟣
Mar 28  Mock Test 4 (GATE Overflow)    🟠
Apr 01  Sem Exam — DSA (Leave)         ⬛
```
- Clicking any item opens its edit modal

### 6.7 Alerts Strip

Show only if relevant. Shown as simple text banners, not popups:
- If any revision session is overdue: "DBMS revision was due Mar 10. It's now marked missed."
- If any subject is behind planned end date: "Algorithms is 5 days behind plan."
- If no events are planned for next 7 days: "Nothing planned for next week. Go to Calendar and add your study days."

---

## SECTION 7 — CALENDAR PAGE (Full Planner)

This is where the user builds their entire plan. It is a full-page calendar.

### 7.1 Calendar View

Same calendar as dashboard but full-page. Month view default with year-view toggle.

### 7.2 Add Event Modal

When user clicks a future date → modal opens:

```
Date: [Auto-filled, read-only]

Event Type: [Study] [Revision] [Mock Test] [Subject Test] [PYQ Day] [Sem Exam] [Leave] [Buffer]

Subject: [Dropdown — only shown for Study, Revision, Subject Test, PYQ]

Label: [Text field — e.g., "DBMS - SQL Unit 3"]

Notes: [Optional text]

[Save]  [Cancel]
```

For "Mock Test" type, additional fields:
- Test name
- Platform (dropdown: GATE Overflow, Made Easy, TestBook, Unacademy, Self, Other)

### 7.3 Edit Event Modal

When user clicks a FUTURE event:
- Same form as above, pre-filled
- Add a "Delete Event" button (with confirm)

When user clicks a PAST event:
- Read-only view: "Planned: [details] | Status: Completed / Missed"
- No edit allowed
- Small note at bottom: "Past events cannot be edited."

### 7.4 Bulk Add Helper

A secondary panel (collapsible) for power planning:

"Quick fill study days for a subject:"
- Select subject
- Select date range (from → to)
- Choose days of week to include (Mon, Tue, Wed...)
- Exclude certain dates (e.g., Sundays, known off days)
- Preview count: "This will add 18 study days for DBMS"
- [Generate Events] button

This fills the calendar automatically for a subject's study window. Events are editable after generation.

### 7.5 — SCHEDULE CASCADE SHIFT (Critical Feature)

This is the "push forward" or "slip day" system. It solves the exact problem of: user misses a day, and instead of the plan becoming stale and irrelevant, the uncompleted events roll forward automatically.

---

**How it works conceptually:**

The user planned:
```
Jul 02:  2 lec DBMS + 1 lec CN
Jul 03:  2 lec DBMS + 1 lec CN
Jul 04:  1 lec DBMS + 1 lec COA   ← CN officially finishes here
```

User missed Jul 02 entirely. They did not mark it done. At end of day (midnight), the app detects the uncompleted event.

**Two things happen:**

1. Jul 02 is permanently marked "Missed" in the log (red ❌ on past calendar — cannot be changed, per no-backdating rule)

2. The unfinished content from Jul 02 is **cascade-shifted forward** — inserted into Jul 03, and Jul 03's content gets pushed to Jul 04, and so on down the chain until a buffer day or a blocked day absorbs the shift.

After cascade shift, the calendar looks like:
```
Jul 02:  ❌ MISSED — 2 lec DBMS + 1 lec CN
Jul 03:  [shifted] 2 lec DBMS + 1 lec CN  (was Jul 02's content)
         + 2 lec DBMS + 1 lec CN           (original Jul 03 content)
Jul 04:  [shifted] 2 lec DBMS + 1 lec CN  (was Jul 03's content)
         + 1 lec DBMS + 1 lec COA          (original Jul 04 content)
Jul 05:  [shifted] 1 lec DBMS + 1 lec COA (was Jul 04's content — CN still ends here)
...and so on
```

---

**IMPORTANT DESIGN DECISION — User Controls the Shift:**

Do NOT auto-cascade silently. The missed day detection should trigger a visible prompt the next time the user opens the app:

A banner at the top of the dashboard (and calendar page):

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠  You missed Jul 02 (2 lec DBMS + 1 lec CN)                  │
│  Your schedule is 1 day behind ideal.                           │
│                                                                 │
│  What do you want to do?                                        │
│  [Shift everything forward 1 day]   [I'll handle it manually]  │
└─────────────────────────────────────────────────────────────────┘
```

- **"Shift everything forward 1 day"** → triggers cascade (see algorithm below)
- **"I'll handle it manually"** → dismisses banner, calendar stays as-is, user can drag/edit events themselves

This keeps the user in control. The app never silently moves things.

---

**Cascade Shift Algorithm:**

When user confirms shift of N missed days:

```
INPUTS:
  shiftFrom     = the first missed date (e.g., Jul 02)
  shiftDays     = how many days to push forward (e.g., 1)
  stopAt        = GATE exam date (never shift past this)
  protectedDays = events of type "sem_exam" | "leave" | "mock_test"
                  (these CANNOT be shifted — they are fixed in time)

ALGORITHM:
  1. Collect all FUTURE calendar events from shiftFrom onward
     that are NOT protected types (sem_exam, leave, mock_test)

  2. For each such event, add shiftDays to its date

  3. If shifting causes an event to land on a protected day:
     → Skip that day and land on the next available unprotected day
     → Continue shifting from there (accordion around protected days)

  4. If any shifted event would land AFTER the GATE exam date:
     → Do not shift that event
     → Show a warning: "X events could not be shifted — they would
        fall after your GATE exam date. Please review manually."

  5. Save all updated event dates to Firestore in a batch write

  6. Mark the missed date's events as "missed_and_shifted" status
     (distinct from just "missed" — so the calendar can show it differently)

  7. Update each affected subject's plannedEndDate to reflect the new last
     event date for that subject
```

---

**Drift Indicator — "Behind Your Ideal Schedule" Panel:**

Always visible on the Dashboard as a compact status bar (not a popup, not a banner unless action needed). Shows permanently:

```
Schedule Drift
──────────────────────────────────────────────
Ideal plan:      Finish DBMS by Aug 15
Current plan:    Finish DBMS by Aug 17  (+2 days)
Ideal plan:      Finish CN by Jul 04
Current plan:    Finish CN by Jul 06    (+2 days)

Overall drift:   +2 days behind ideal
──────────────────────────────────────────────
[ View full drift report ]
```

This panel:
- Calculates drift per subject as: (current planned end date) - (original planned end date)
- Shows total overall drift in days
- Green if 0 drift, yellow if 1–3 days behind, orange if 4–7 days, red if 7+ days
- Updates in real-time whenever a cascade shift happens

**Full Drift Report (Analytics page section):**

A dedicated section showing:
- Timeline chart: original plan line vs current shifted plan line per subject
- List of all shift events: "Jul 02 missed → shifted 1 day. Jul 09 missed → shifted 1 day. Total: 2 days."
- If buffer days were consumed by shifts: "2 of your 4 buffer days have been used by schedule slips."
- End-of-chain warning: "If you slip 3 more days, DBMS will finish after its revision date. Adjust revision or pick up pace."

---

**Buffer Days and How They Absorb Shifts:**

When the user creates a "Buffer" day on the calendar (a free/flex day with no content), that day acts as a shock absorber.

During cascade shift: if a shifted event lands on a buffer day, it fills that buffer day with content instead of pushing everything further forward. The buffer is consumed. The shift chain stops there (the days after the buffer are unaffected).

Example:
```
Jul 05: Buffer day (empty)   ← absorbs shift here
Jul 06: COA Unit 1
```
After a 1-day slip from Jul 02, the cascade stops at Jul 05 (buffer absorbs it):
```
Jul 05: [shifted] 1 lec DBMS + 1 lec COA  ← buffer consumed
Jul 06: COA Unit 1                          ← untouched
```

Show consumed buffer days in a different visual style: light orange background with "Buffer used" label.

---

**What CAN be shifted vs what CANNOT:**

| Event Type     | Shiftable? | Reason |
|----------------|-----------|--------|
| Study day      | ✅ Yes     | Core shiftable content |
| Revision day   | ✅ Yes     | Can move revision if needed |
| PYQ day        | ✅ Yes     | Flexible |
| Subject test   | ✅ Yes     | Can reschedule |
| Buffer day     | ✅ Yes (consumed) | Absorbs shifts |
| Mock test      | ❌ No      | External test, fixed date |
| Sem exam       | ❌ No      | Fixed by college |
| Leave day      | ❌ No      | Fixed personal commitments |

---

**Manual Drag-to-Reschedule (simpler alternative):**

For users who prefer to adjust manually instead of auto-cascade:
- On the Calendar page, allow drag-and-drop of FUTURE events to different future dates
- Dragging an event onto an occupied day merges both events into that day (shown as stacked)
- Dragging onto a blocked/protected day is not allowed (shows error)
- On mobile: tap event → "Move to date" → date picker (drag not practical on mobile)

---

## SECTION 8 — SUBJECTS PAGE

### 8.1 Subjects List

Grid of subject cards. Each card:
```
┌─────────────────────────────────────┐
│  DBMS                         🟠    │   (color dot matches subject color)
│  ████████████░░░░░░  67%            │   (progress bar)
│  4 / 6 units complete               │
│  Planned end: Aug 15, 2025          │
│  Status: In Progress                │
│  Next: Revision on Sep 1            │
│                        [Open →]     │
└─────────────────────────────────────┘
```
- "Not configured" card state for subjects the user hasn't set up yet
- A "+ Add Subject" button to add a custom subject
- Edit icon on each card to rename/recolor

### 8.2 Subject Detail Page `/subjects/:id`

**Header:** Subject name, color bar, status badge, completion %

**Section A — Setup (editable inline):**
All fields editable. Show a small pencil icon next to each field.
```
Total Units:          [6]    (editable number)
Lectures Per Day:     [2]    (editable number)
Planned Start:        [date picker]
Planned End:          [date picker — auto-calculated but overridable]
PYQ Days Planned:     [5]    (editable)
Subject Tests Planned:[3]    (editable)
Revision Days Planned:[2]    (editable)
GATE Weightage %:     [8]    (editable — used in weighted progress)
```

When user edits Lectures Per Day or Total Units → auto-recalculate and show:
"At 2 lectures/day, this subject takes approximately 24 days."

**Section B — Units List:**

Each unit is a row:
```
[ ]  Unit 1: ER Model & Relational Model    8 topics    4 lectures    [Edit]
[✓]  Unit 2: SQL                           10 topics    5 lectures    Done on Aug 3
[ ]  Unit 3: Normalization                  7 topics    4 lectures    [Edit]
```
- Checkbox: only clickable if the unit's row date is TODAY or in the future
- If past and unchecked: shows red "Missed" text, checkbox is disabled
- [+ Add Unit] button at bottom
- Each unit editable: name, topic count, lectures needed

Clicking the checkbox for a unit that is due today:
→ Shows a small confirm dialog: "Mark 'SQL' as done today?" → Confirm → saves with today's date

**Section C — Revision Tracker:**

List of planned revision sessions:
```
Revision 1:  [date picker]  [Done on: —]  [Notes: ___]   Status: Upcoming
Revision 2:  [date picker]  [Done on: —]  [Notes: ___]   Status: Upcoming
```
- Past revision that wasn't done: shows "Missed — cannot mark done"
- Today's revision: shows "Mark Done Today" button
- [+ Add Revision Date] button

**Section D — Subject Notes:**
Free-form text area. Auto-saves to Firestore on blur.

**Section E — Subject Stats:**
Calculated, read-only:
- Days since started
- Actual units/day rate
- Projected finish date at current pace (vs planned)
- If behind: "At current pace, you'll finish X days late."
- Revision sessions done / planned
- Tests done / planned

---

## SECTION 9 — MOCK TESTS PAGE

### 9.1 Add Test Form

```
Test Name:       [text — e.g., "Mock Test 4"]
Date:            [date picker — only today or past dates allowed]
Platform:        [GATE Overflow / Made Easy / TestBook / Unacademy / NPTEL / Self / Other]
Marks Scored:    [number]
Total Marks:     [default 100, editable]
Percentile:      [optional number]

Subject-wise Breakdown (optional, expandable):
  For each subject: Attempted [n]  Correct [n]  Marks [n]

Notes / Observations:
[text area — e.g., "Strong in DS, weak in TOC. Attempted 50/65."]

[Save Test]
```

### 9.2 Test History Table

Sortable by date (default: newest first):
```
Date        | Test Name    | Score  | %     | Percentile | Platform   | Actions
Mar 15      | Mock Test 4  | 62/100 | 62%   | 71.2       | GO         | Edit | Delete
Mar 01      | Mock Test 3  | 58/100 | 58%   | 65.4       | Made Easy  | Edit | Delete
```

All past tests are fully editable (mock test records are factual notes — no integrity lock needed).

### 9.3 Mock Test Graphs (Recharts)

**Graph 1 — Score Trend (Line Chart):**
- X = test number, Y = score %
- Add a dashed horizontal line at user's target score
- Show: "Best: 72% | Average: 63% | Last: 67%"

**Graph 2 — Subject Weakness Radar:**
- Show only if at least 3 tests have subject breakdown data
- 8-axis radar: each axis = a subject, value = avg accuracy %
- Makes weak spots instantly visible

**Graph 3 — Score Distribution (Bar):**
- Buckets: 0-40%, 41-50%, 51-60%, 61-70%, 71-80%, 81%+
- Shows how many tests fell in each range

**Graph 4 — Percentile Trend (Line):**
- Only shown if percentile data exists for 3+ tests

---

## SECTION 10 — ANALYTICS PAGE

All graphs pull from real Firestore data. No hardcoded values. Show a loading skeleton while data loads.

### 10.1 Syllabus Coverage Over Time (Area Chart)

- X = calendar dates (from start date to today)
- Y = % of syllabus completed (weighted by GATE weightage × topics per subject)
- Blue filled area = actual progress
- Dashed orange line = ideal pace (100% by exam date, linear)
- If actual is below ideal → area between them is light red
- If above → light green

### 10.2 Subject Completion Gantt Chart (Horizontal Bar)

- Each row = one subject
- Bar = from plannedStartDate to plannedEndDate
- Green fill if completed, blue fill if in progress, gray if not started
- Show actual completion date marker if done
- Show "TODAY" vertical red line
- Shows at a glance if subjects are on time or delayed

### 10.3 Daily Hours Studied (Bar Chart — Last 30 Days)

- X = dates, Y = hours studied
- Green bar = met or exceeded daily target
- Yellow = partial (50-100% of target)
- Red = missed/0
- Horizontal dashed line = daily target

### 10.4 Missed Days Analysis

- List: every past calendar event that was planned and not marked done
- Group by subject
- Show total topic debt: "You missed 14 planned units across 8 days"
- No recovery plan suggestions — just the honest number

### 10.5 Revised Finish Date Projection

For each subject, calculate:
- planned finish date vs projected finish date at current pace
- Show as a simple table: green if on track, red if late

### 10.6 Mock Test vs Syllabus Coverage Scatter Plot

- X = syllabus % at time of test, Y = score %
- Shows whether more coverage is correlating with better scores
- Only meaningful with 5+ tests

---

## SECTION 11 — SETTINGS PAGE

### 11.1 GATE Configuration

```
GATE Exam Date:         [date picker — required]
Target Score:           [number, e.g., 65]
Daily Study Target:     [slider 1-12 hours]
Prep Start Date:        [date — for Day N counter on dashboard]
```

### 11.2 Notifications

```
Daily Reminder:          [toggle]
Reminder Time:           [time picker]
```

Uses browser Notification API. Morning reminder shows today's planned events. Evening reminder (8 PM) if nothing logged yet.

### 11.3 Data Management

```
Export All Data:   [Download JSON button]
Reset Everything:  [Red button with confirm dialog — "Type RESET to confirm"]
Firebase Sync:     [Status: Online / Offline / Syncing]
Device ID:         [Shows anonymous UID — for reference]
Link Google Account: [Button — enables cross-device login]
```

> For Google Sign-In cross-device setup:
> See Firebase Setup Step 8 in the code comments (Section 2).

---

## SECTION 12 — ONBOARDING FLOW (First Launch Only)

Show when no goals/main document exists in Firestore.

**Step 1 — Welcome:**
"This is your GATE CS preparation tracker. It doesn't plan for you — you bring your plan, and it keeps you honest.
Start by answering a few questions."

**Step 2 — GATE Date:**
"When is your GATE exam?"
→ Date picker. Required to proceed.
→ Shows: "That's X days from today."

**Step 3 — Daily Target:**
"How many hours can you realistically study per day?"
→ Slider 1–12. Default 5.

**Step 4 — Target Score (optional):**
"What score are you aiming for? (GATE is out of 100)"
→ Number input. Can skip.

**Step 5 — Done:**
"You're set up. Your tracker is empty — go to Subjects to define your plan for each subject, and to Calendar to mark your study days."
→ [Go to Subjects] button
→ [Go to Calendar] button
→ [Open Dashboard] button

That's it. No auto-scheduling. No pre-filling. User does it themselves.

---

## SECTION 13 — DESIGN SYSTEM

### Colors & Theme

Dark, clean, low-distraction. Inspired by dev tools / terminal dashboards.

```
Background:       #0F1117
Surface:          #1A1D27
Border:           #272B3B
Text primary:     #E8EAF0
Text secondary:   #8B90A0
Text muted:       #4A4F62
Accent blue:      #4F8EF7
Accent green:     #22C55E
Accent red:       #EF4444
Accent orange:    #F59E0B
Accent purple:    #A78BFA
```

### Typography

- UI labels, nav: `'DM Mono'` (Google Fonts) — monospace, clean
- Body text, notes: `'DM Sans'` (Google Fonts)
- Numbers, stats: `'JetBrains Mono'` (Google Fonts) — makes data feel precise

### Layout Rules

- Sidebar: 220px, always visible on desktop. Collapses to bottom tab bar on mobile.
- Max content width: 1200px, centered
- Cards: subtle border, no drop shadows — use borders only
- Inputs: always clearly labeled. Never placeholder-only.
- Empty states: always show a helpful instruction. Never a blank screen.
  Example: "No subjects configured yet. Click 'Add Subject' to start."

### Motion

- Keep animations minimal. One fade-in on page load. No animations on data updates.
- Progress bar fills smoothly (CSS transition, 0.5s ease).
- Modal: simple fade + scale in (150ms).
- No confetti, no XP popups, no celebratory animations.

### Instructional Text

Every section that is empty must have instructional helper text in muted color:
```
Subjects page empty:     "No subjects set up. Click '+ Add Subject' to define your
                          first subject — set its units, lectures per day, and target dates."

Calendar empty:          "Your calendar is empty. Click any future date to add a study day,
                          revision session, mock test, or blocked day."

Mock tests empty:        "No tests recorded yet. Click 'Add Test' after taking your first mock."

Dashboard empty:         "Set up your subjects and calendar first to see progress here."
```

---

## SECTION 14 — TECHNICAL NOTES

### State Management: Zustand

```
stores/
  useAuthStore.js        → uid, auth state
  useGoalsStore.js       → GATE date, daily target
  useSubjectsStore.js    → all subjects + units
  useCalendarStore.js    → all calendar events
  useMockTestStore.js    → all mock tests
  useDailyLogStore.js    → daily logs
  useUIStore.js          → active modal, sidebar open state
```

### Write Pattern (Optimistic + Firebase)

```javascript
// 1. Update Zustand state immediately (instant UI)
// 2. Write to Firestore in background
// 3. On error: show toast + revert Zustand state
// Never block the UI waiting for Firestore

const markUnitDone = async (subjectId, unitId) => {
  const today = new Date().toISOString().split('T')[0];
  
  // INTEGRITY CHECK — no backdating
  const unit = getUnit(subjectId, unitId);
  if (unit.plannedDate && unit.plannedDate < today) {
    showToast("This unit was planned for the past. It cannot be marked done now.");
    return;
  }
  
  // Optimistic update
  useSubjectsStore.getState().markUnitDone(subjectId, unitId, today);
  
  // Firebase write
  try {
    await updateDoc(/* ... */);
  } catch {
    useSubjectsStore.getState().revertUnit(subjectId, unitId);
    showToast("Sync failed. Check connection.");
  }
};
```

### Offline Support

```javascript
// Already handled by enableIndexedDbPersistence(db) in config.js
// Firestore queues writes when offline and syncs automatically
// Show a small "Offline — changes will sync" indicator in the header when offline
// Detect with: window.addEventListener('online/offline', ...)
```

---

## SECTION 15 — FEATURE BUILD CHECKLIST (for agent — in order)

- [ ] Firebase config + anonymous auth + Firestore schema init
- [ ] Zustand stores setup
- [ ] localStorage cache layer (read on startup, write on every Firestore write)
- [ ] Onboarding flow (5 steps)
- [ ] Settings page (GATE date, target, daily hours)
- [ ] Subjects list page (empty state + add subject + card grid)
- [ ] Subject detail page (full: units, revision, notes, stats)
- [ ] No-backdating rule enforcement across all write paths
- [ ] Calendar page (month view, add/edit modal, bulk add helper)
- [ ] Dashboard: exam countdown + today's snapshot + overall progress
- [ ] Dashboard: global calendar (full journey view + month view toggle)
- [ ] Dashboard: subject progress strip
- [ ] Dashboard: upcoming 14-day events list
- [ ] Dashboard: alert strip (overdue revisions, behind-schedule subjects)
- [ ] Cascade shift: missed day detection on every app open (check past events with done=false)
- [ ] Cascade shift: user prompt banner — "Shift forward N days" or "Handle manually"
- [ ] Cascade shift: algorithm (shift N days, accordion around protected days, buffer absorption, stop at GATE date)
- [ ] Cascade shift: "shifted" event status + light orange outline visual on calendar
- [ ] Cascade shift: drift indicator panel on dashboard (per-subject drift + overall drift in days, color-coded)
- [ ] Cascade shift: drift history on analytics page (original plan vs current plan timeline per subject)
- [ ] Cascade shift: buffer day consumed visual (light orange bg + "Buffer used" label)
- [ ] Cascade shift: end-of-chain warning if shifted events would collide with revision/exam dates
- [ ] Manual drag-to-reschedule for future events on calendar
- [ ] Mock tests page (add form + history table + 4 graphs)
- [ ] Analytics page (all 6 charts + drift section with Recharts + real data)
- [ ] Mobile responsive layout (sidebar → bottom nav)
- [ ] Empty state instructional text on every page/section
- [ ] Offline indicator in header
- [ ] Export data as JSON
- [ ] Browser notification API for daily reminders
- [ ] Firebase Hosting deploy config

---

## FINAL NOTES TO AGENT

1. **Everything starts empty.** Do not pre-fill any subjects, calendar events, or progress data. The user fills it in.

2. **The no-backdating rule is non-negotiable.** Any past event that was not marked done on the day it was due is permanently missed. Enforce this check on every single write path that involves marking something "done." The cascade shift system does NOT override this — missing a day is still recorded as missed. Shift only moves future uncompleted events forward; it does not erase or fix the missed day.

3. **The cascade shift is user-triggered, not automatic.** When a missed day is detected, show the banner and wait for the user to choose. Never silently move events. The user must explicitly confirm before any calendar dates change.

4. **The global calendar on the dashboard is the most important visual in the app.** It must span from today to the GATE exam date. It must show every event type color-coded with a clear legend (including the "shifted" color). It must support both month view and full-journey-at-once view. Make it the visual centerpiece.

5. **The drift indicator must always be visible on the dashboard.** Not a popup, not hidden behind a click — a permanent compact panel showing how many days behind ideal the current plan is, per subject and overall. This is the "bigger picture" the user wants to see without going to the copy.

6. **Subject progress is defined entirely by the user.** The user says "DBMS has 6 units, 35 total topics, 2 lectures/day." As they mark units done, the progress bar fills. 6/6 units = 100% complete. The app calculates nothing on its own — it only reflects what the user entered and what they marked done.

7. **Keep the UI minimal.** Maximum 2 levels of visual hierarchy per page. If a screen has more than 6 distinct elements, split it or collapse some.

8. **Every input must be editable.** Plans change. Subject dates, unit counts, test dates — all editable. Editing an already-planned event on the calendar is fine as long as the event is in the future.

9. **Graphs must show real data from Firestore.** Never hardcode. If data is insufficient for a graph (e.g., fewer than 2 data points), show an empty state message explaining what's needed.

10. **No gamification of any kind.** No XP, no levels, no badges, no streaks, no celebrations, no confetti, no motivational popups. The app is a mirror — it shows the truth. The motivation is the truth itself.

---

*A tool is only as good as how honestly you use it.*
