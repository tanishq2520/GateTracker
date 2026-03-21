# GATE CS Tracker 🎯

> A clean, minimal study tracking web app for GATE CS aspirants. Plan your syllabus, track daily tasks, monitor mock test progress, and stay on schedule.

🌐 **Live at:** [gate.tanishqdev.me](https://gate.tanishqdev.me)

---

<!-- SCREENSHOT: Full dashboard view -->
> `[ Add dashboard screenshot here ]`

---

## ✨ Features

- **Journey Calendar** — full visual calendar from today to your GATE exam date, color-coded by event type
- **Subject Progress** — define your own units, lectures/day, and target dates. Progress fills as you mark done
- **Daily Task System** — add tasks per day, mark individually, tracks partial completion honestly
- **Quick Fill** — bulk-assign tasks across a date range in one shot
- **Mock Test Tracker** — log scores, view trend graphs, subject-wise weakness radar
- **Schedule Drift** — miss a day? cascade-shift your entire future schedule forward with one click
- **Analytics** — syllabus coverage, daily hours chart, Gantt chart, missed days
- **Gamification** — XP, levels, streaks, badges, weekly challenges
- **Auth** — email/password + Google sign-in

---

## 🛠️ Tech Stack

| | |
|---|---|
| Frontend | React + Vite |
| Styling | TailwindCSS |
| Charts | Recharts |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Storage | Firebase Storage |
| Hosting | Firebase Hosting |

---

## 🚀 Quick Start

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/gate-cs-tracker.git
cd gate-cs-tracker
npm install
```

### 2. Firebase setup

You need your own Firebase project:

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → create a project
2. Register a **Web App** → copy the `firebaseConfig` object
3. Enable **Firestore Database** → test mode → region `asia-south1`
4. Enable **Authentication** → turn on Email/Password and Google
5. Enable **Storage** → test mode
6. Update Firestore rules (Rules tab):
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

### 3. Add config

Create a `.env` file in the project root:
```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Update `src/firebase/config.js`:
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

> ⚠️ Add `.env` to your `.gitignore` — never commit real keys to GitHub.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

<!-- SCREENSHOT: Subjects + Calendar -->
> `[ Add subjects / calendar screenshot here ]`

---

## 📦 Deploy

```bash
npm run build
firebase deploy --only hosting
```

Run these two commands every time you want to push updates live.

---

## ⚠️ How the App Works

**No backdating** — if you didn't mark a task done on its day, it's permanently missed. No going back. Honest tracking only.

**Cascade shift** — missing a day shows a banner asking if you want to shift all future events forward. You choose — the app never moves things silently.

**Sem exam vs Leave** — both shift the schedule, but only leave days count as drift (falling behind ideal pace).

---

## 🐛 Common Issues

| Problem | Fix |
|---|---|
| Blank screen after login | Check `firebaseConfig` values in `.env` |
| Permission denied | Update Firestore Rules and click Publish |
| Google sign-in blocked | Allow popups for localhost in browser |
| Changes not on live site | Run `npm run build` before `firebase deploy` |

---

## 🙌 Built by

**Tanishq Pal** — GATE CS 2027 aspirant

> *"A tool is only as good as how honestly you use it."*
