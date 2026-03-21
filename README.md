# GATE CS Tracker 🎯

> A clean, minimal, honest study tracking web app for GATE CS aspirants.
> Plan your syllabus, track daily tasks, monitor mock test progress, and stay on schedule — all in one place.

---

<!-- SCREENSHOT: Full dashboard view -->
> 📸 **Screenshot — Dashboard**
> `[ Add dashboard screenshot here ]`

---

## ✨ Features

- **Journey Calendar** — full visual calendar from today to your GATE exam date, color-coded by event type
- **Subject Progress Tracker** — define your own units, lectures/day, and target dates per subject. Progress fills as you mark things done
- **Daily Task System** — add tasks for each day, mark them done individually, track partial completion honestly
- **Quick Fill Study Days** — bulk-assign tasks across a date range in one go
- **Mock Test Tracker** — log test scores, view score trend graphs, subject-wise weakness radar
- **Schedule Drift System** — if you miss a day, cascade-shift your future schedule forward with one click
- **Sem Exam vs Leave logic** — sem exams shift schedule but don't count as drift. Leave days do
- **Analytics** — syllabus coverage over time, daily hours chart, Gantt chart, missed days analysis
- **Gamification** — XP system, levels, streaks, badges, weekly challenges, boss battles on subject completion
- **Authentication** — email/password + Google sign-in, 1-hour session persistence
- **User Profile** — change name, photo, GATE exam date, target score, daily hour target
- **Custom Domain** — deployable to Firebase Hosting with your own domain
- **Offline Support** — works without internet, syncs when back online

---

<!-- SCREENSHOT: Calendar page with events filled in -->
> 📸 **Screenshot — Calendar**
> `[ Add calendar screenshot here ]`

---

<!-- GIF: Marking a task as done, progress bar updating -->
> 🎬 **GIF — Marking task done**
> `[ Add GIF here ]`

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) |
| Styling | TailwindCSS |
| Charts | Recharts |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| File Storage | Firebase Storage |
| Hosting | Firebase Hosting |
| State Management | Zustand |
| Offline Cache | localStorage + IndexedDB (Firebase persistence) |

---

## 📦 Prerequisites

Before you begin, make sure you have these installed:

- **Node.js** v18 or higher — [download here](https://nodejs.org)
- **npm** v9 or higher (comes with Node.js)
- **Git** — [download here](https://git-scm.com)
- A **Firebase account** — [firebase.google.com](https://firebase.google.com) (free)
- A **Google account** (same one for Firebase)

Check your versions:
```bash
node --version    # should be v18+
npm --version     # should be v9+
```

---

## 🚀 Installation & Setup

### Step 1 — Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/gate-cs-tracker.git
cd gate-cs-tracker
```

### Step 2 — Install dependencies

```bash
npm install
```

---

### Step 3 — Firebase Project Setup

You need to create your own Firebase project. Follow these steps exactly:

#### 3.1 Create Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add Project"**
3. Name it anything (e.g. `gate-cs-tracker`)
4. Disable Google Analytics (not needed)
5. Click **"Create Project"**

#### 3.2 Register a Web App
1. On project home, click the **`</>`** (Web) icon
2. App nickname: `gate-tracker-web`
3. Check **"Also set up Firebase Hosting"**
4. Click **"Register App"**
5. **Copy the `firebaseConfig` object** shown — you'll need it in Step 4

It looks like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

#### 3.3 Create Firestore Database
1. Left sidebar → **Build → Firestore Database**
2. Click **"Create Database"**
3. Choose **"Start in test mode"**
4. Region: **`asia-south1`** (Mumbai) — or closest to you
5. Click **"Enable"**

#### 3.4 Enable Authentication
1. Left sidebar → **Build → Authentication → Get Started**
2. Go to **"Sign-in method"** tab
3. Enable **Email/Password** → Save
4. Enable **Google** → add your support email → Save

#### 3.5 Enable Storage
1. Left sidebar → **Build → Storage → Get Started**
2. Choose **"Start in test mode"**
3. Same region as Firestore → **Done**

#### 3.6 Update Firestore Security Rules
1. Firestore → **Rules** tab
2. Replace everything with:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
3. Click **Publish**

#### 3.7 Update Storage Security Rules
1. Storage → **Rules** tab
2. Replace everything with:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
3. Click **Publish**

---

### Step 4 — Add Firebase Config to the Project

Open the file `src/firebase/config.js` and paste your config from Step 3.2:

```javascript
const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_AUTH_DOMAIN_HERE",
  projectId: "PASTE_YOUR_PROJECT_ID_HERE",
  storageBucket: "PASTE_YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "PASTE_YOUR_SENDER_ID_HERE",
  appId: "PASTE_YOUR_APP_ID_HERE"
};
```

> ⚠️ **Never commit your real config to a public GitHub repo.** Use environment variables for production. See the [Environment Variables](#-environment-variables) section below.

---

### Step 5 — Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

You should see the login page. Create an account and start setting up your planner.

---

<!-- SCREENSHOT: Login page -->
> 📸 **Screenshot — Login Page**
> `[ Add login page screenshot here ]`

---

## 🔐 Environment Variables (Recommended for Production)

Instead of putting your Firebase config directly in the code, use a `.env` file:

1. Create a file called `.env` in the project root:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

2. Update `src/firebase/config.js` to use these:
```javascript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
```

3. Add `.env` to your `.gitignore`:
```
.env
.env.local
```

---

## 🌐 Deployment to Firebase Hosting

### One-time setup

Install Firebase CLI:
```bash
npm install -g firebase-tools
```

Login:
```bash
firebase login
```

Initialize hosting in project folder:
```bash
firebase init hosting
```

Answer the prompts:
```
? Which Firebase project? → select your project
? Public directory? → dist
? Single-page app? → Yes
? Automatic GitHub builds? → No
? Overwrite dist/index.html? → No
```

### Deploy

Every time you want to push changes live:
```bash
npm run build
firebase deploy --only hosting
```

Your app will be live at `https://your-project.web.app`

---

## 🌍 Custom Domain Setup (Optional)

If you have your own domain (e.g. `gate.yourdomain.com`):

1. Firebase Console → **Hosting → Add custom domain**
2. Enter your subdomain (e.g. `gate.yourdomain.com`)
3. Firebase gives you a **CNAME record** to add
4. Go to your domain provider (Namecheap, GoDaddy, Cloudflare etc.)
5. Add the CNAME record:
   ```
   Type:  CNAME
   Host:  gate
   Value: your-project.web.app
   TTL:   Automatic
   ```
6. Back in Firebase → click **Verify**
7. Wait up to 24 hours for DNS propagation
8. Firebase auto-provisions a free SSL certificate

---

<!-- SCREENSHOT: Subjects page with progress bars -->
> 📸 **Screenshot — Subjects Page**
> `[ Add subjects screenshot here ]`

---

<!-- SCREENSHOT: Mock tests page with score trend graph -->
> 📸 **Screenshot — Mock Tests & Analytics**
> `[ Add analytics screenshot here ]`

---

<!-- GIF: Quick Fill study days filling the calendar -->
> 🎬 **GIF — Quick Fill calendar**
> `[ Add GIF here ]`

---

## 📁 Project Structure

```
gate-cs-tracker/
├── src/
│   ├── components/         # Reusable components (Avatar, ProtectedRoute, etc.)
│   ├── context/            # AuthContext — manages login state
│   ├── firebase/           # Firebase config and init
│   ├── pages/              # One file per page
│   │   ├── DashboardPage.jsx
│   │   ├── CalendarPage.jsx
│   │   ├── SubjectsPage.jsx
│   │   ├── SubjectDetailPage.jsx
│   │   ├── MockTestsPage.jsx
│   │   ├── AnalyticsPage.jsx
│   │   ├── AchievementsPage.jsx
│   │   ├── SettingsPage.jsx
│   │   └── LoginPage.jsx
│   ├── stores/             # Zustand state stores
│   ├── utils/              # Helper functions (date formatting, abbreviations etc.)
│   ├── App.jsx             # Router setup
│   └── main.jsx            # Entry point
├── public/
├── .env                    # Your Firebase config (not committed)
├── .gitignore
├── firebase.json           # Firebase hosting config
├── vite.config.js
└── package.json
```

---

## 🗃️ Firestore Data Structure

```
(root)/
├── goals/
│   └── main                    → GATE exam date, target score, daily hours
├── subjects/
│   └── {subjectId}             → subject name, units, progress, revision dates
├── calendarEvents/
│   └── {eventId}               → date, type, label, color, done status
├── dailyLogs/
│   └── {YYYY-MM-DD}            → tasks for that day, completion status
├── mockTests/
│   └── {testId}                → test name, score, date, subject breakdown
├── userProfile/
│   └── main                    → display name, age, photo URL
└── gamification/
    ├── stats                   → totalXP, level
    ├── streak                  → currentStreak, longestStreak, freezes
    ├── badges                  → earned badges array
    └── weeklyChallenge         → current challenge + progress
```

---

## 🎮 Gamification System

| Action | XP |
|---|---|
| Mark a unit done | +10 XP |
| Complete full day's plan | +50 XP |
| Complete a subject | +500 XP |
| Log a mock test | +30 XP |
| Score higher than last mock | +100 XP |
| Complete a revision session | +40 XP |
| Study 6+ hours in a day | +80 XP |

Levels range from **"Enrolled" (Lv 1)** to **"GATE Ready" (Lv 10)** at 42,000+ XP.

---

## ⚠️ Important Rules Built Into the App

**No backdating:** If a task was planned for a past date and you didn't mark it done on that day — it's permanently missed. You cannot go back and mark it complete. This is intentional — the tracker shows honest data only.

**Cascade shift:** If you miss a day or add a sem exam/leave, all future shiftable events move forward. Mock tests, sem exams, and leave days are protected and don't shift.

**Sem exam vs Leave:** Both shift the schedule, but only leave days count as "drift" (being behind your ideal pace). Sem exams are expected obligations and don't penalize your drift score.

---

## 🐛 Common Issues

**App shows blank screen after login**
→ Check browser console for Firebase errors. Most likely your `firebaseConfig` in `config.js` has wrong values.

**Firestore permission denied**
→ Make sure you updated Firestore Rules (Step 3.6) and clicked Publish.

**Google sign-in popup blocked**
→ Allow popups for localhost in your browser settings.

**`firebase deploy` fails**
→ Run `firebase login` again. Your session may have expired.

**Changes not showing on live site**
→ Make sure you ran `npm run build` before `firebase deploy`. The `dist` folder must be rebuilt first.

**DNS not propagating for custom domain**
→ Wait up to 24 hours. You can check propagation status at [dnschecker.org](https://dnschecker.org).

---

## 🔄 Updating the Live Site

Every time you make changes and want to push them live:

```bash
npm run build
firebase deploy --only hosting
```

That's it. Takes about 30 seconds.

---

## 📝 License

This project is for personal use. Feel free to fork and adapt for your own GATE preparation.

---

## 🙌 Built By

**Tanishq Pal** — GATE CS 2027 aspirant

Built with React, Firebase, and a lot of late nights.

> *"A tool is only as good as how honestly you use it."*
