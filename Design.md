@workspace Completely redesign the visual layer of the entire app — background, layout structure, typography, navigation, and card styles. Do NOT change any functionality, data, Firebase logic, or component logic. Only change how everything looks.

PART 1 — Video Background (applies to entire app, all pages)
Add a fullscreen looping video background that sits behind everything:
jsx<video
autoPlay
loop
muted
playsInline
style={{
    position: 'fixed',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    zIndex: 0,
    pointerEvents: 'none'
  }}

>

  <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4" type="video/mp4" />
</video>
The video is the only background. No CSS gradients, no colored backgrounds, no decorative blobs or radial overlays anywhere. Everything floats over the video.
All page content must have position: relative; z-index: 1 or higher so it appears above the video.

PART 2 — Liquid Glass CSS (global styles)
Add these global CSS classes to index.css:
css.liquid-glass {
background: rgba(255, 255, 255, 0.01);
background-blend-mode: luminosity;
backdrop-filter: blur(16px);
-webkit-backdrop-filter: blur(16px);
border: none;
box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
position: relative;
overflow: hidden;
}

.liquid-glass::before {
content: '';
position: absolute;
inset: 0;
border-radius: inherit;
padding: 1.4px;
background: linear-gradient(180deg,
rgba(255,255,255,0.45) 0%,
rgba(255,255,255,0.15) 20%,
rgba(255,255,255,0) 40%,
rgba(255,255,255,0) 60%,
rgba(255,255,255,0.15) 80%,
rgba(255,255,255,0.45) 100%);
-webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
-webkit-mask-composite: xor;
mask-composite: exclude;
pointer-events: none;
}

.liquid-glass-strong {
background: rgba(255, 255, 255, 0.06);
backdrop-filter: blur(24px);
-webkit-backdrop-filter: blur(24px);
border: none;
box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.12);
position: relative;
overflow: hidden;
}

.liquid-glass-strong::before {
content: '';
position: absolute;
inset: 0;
border-radius: inherit;
padding: 1px;
background: linear-gradient(180deg,
rgba(255,255,255,0.35) 0%,
rgba(255,255,255,0.08) 30%,
rgba(255,255,255,0) 50%,
rgba(255,255,255,0.08) 70%,
rgba(255,255,255,0.35) 100%);
-webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
-webkit-mask-composite: xor;
mask-composite: exclude;
pointer-events: none;
}

@keyframes fade-rise {
from { opacity: 0; transform: translateY(20px); }
to { opacity: 1; transform: translateY(0); }
}
.animate-fade-rise { animation: fade-rise 0.7s ease-out both; }
.animate-fade-rise-2 { animation: fade-rise 0.7s ease-out 0.15s both; }
.animate-fade-rise-3 { animation: fade-rise 0.7s ease-out 0.3s both; }

PART 3 — Typography
Add to index.html <head>:
html<link rel="preconnect" href="https://fonts.googleapis.com">

<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
CSS variables in index.css:
css:root {
  --font-display: 'Instrument Serif', serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
body { font-family: var(--font-body); }
Usage rules:

Page titles, big numbers (316 days), countdown → font-family: var(--font-display) — elegant and cinematic
All body text, labels, nav links, card text → var(--font-body)
Stats numbers, XP, unit counts, dates → var(--font-mono)

PART 4 — Color System (all text over video/glass)
css--text-primary: rgba(255, 255, 255, 0.95)
--text-secondary: rgba(255, 255, 255, 0.55)
--text-muted: rgba(255, 255, 255, 0.28)
--accent-orange: #F97316
--accent-green: #34D399
--accent-red: #F87171
--accent-amber: #FBBF24
--accent-purple: #A78BFA
Never use solid dark backgrounds on cards. All cards use .liquid-glass or .liquid-glass-strong class.

PART 5 — Navigation Bar (top bar, like Layout 2 Notion style)
Replace the current sidebar-based navigation with a top navigation bar. The sidebar is completely removed. Navigation is horizontal at the top.
jsx<nav className="liquid-glass" style={{
  position: 'fixed',
  top: 0, left: 0, right: 0,
  zIndex: 50,
  padding: '12px 32px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  borderRadius: 0,
  borderBottom: '1px solid rgba(255,255,255,0.08)'
}}>
{/_ Logo _/}
<span style={{
    fontFamily: 'var(--font-display)',
    fontSize: '18px',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: '-0.02em',
    marginRight: '24px'
  }}>
GATE CS
</span>

{/_ Nav links _/}
{['Dashboard', 'Calendar', 'Subjects', 'Mock Tests', 'Analytics', 'Achievements'].map(item => (
<NavLink key={item} to={`/${item.toLowerCase().replace(' ', '-')}`}
style={({ isActive }) => ({
fontSize: '13px',
color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)',
textDecoration: 'none',
padding: '6px 12px',
borderRadius: '6px',
background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
transition: 'all 0.2s',
fontFamily: 'var(--font-body)',
})} >
{item}
</NavLink>
))}

{/_ Right side — days countdown + avatar _/}

  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#F97316' }}>
      316 days to GATE
    </span>
    {/* Avatar — keep existing profile panel logic, just move trigger here */}
    <div onClick={openProfilePanel} style={{
      width: '32px', height: '32px', borderRadius: '50%',
      background: '#F97316', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '11px', fontWeight: 700, color: '#1C1917'
    }}>
      TP
    </div>
  </div>
</nav>
All pages get padding-top: 72px to account for the fixed nav.

PART 6 — Dashboard Layout (Notion-meets-Linear style, big type, less clutter)
The dashboard is the main page. Keep the same data components but rearrange and restyle:
┌────────────────────────────────────────────────────────────┐
│ [Fixed top nav — see Part 5] │
├────────────────────────────────────────────────────────────┤
│ │
│ 316 days [big display font, left] │
│ until GATE 2027 [muted, smaller] │
│ "Quote of the day..." [italic, muted, left border] │
│ │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ Syllabus │ │ Streak │ │ Drift │ [3 glass cards] │
│ │ 0% │ │ 1d │ │ On track │ │
│ └──────────┘ └──────────┘ └──────────┘ │
│ │
│ ┌─────────────────────────┐ ┌───────────────────────┐ │
│ │ TODAY'S TASKS │ │ CALENDAR │ │
│ │ [task list] │ │ [mini month grid] │ │
│ │ [progress bar] │ │ │ │
│ ├─────────────────────────┤ ├───────────────────────┤ │
│ │ SUBJECTS │ │ NEXT 7 DAYS │ │
│ │ [progress bars] │ │ [event list] │ │
│ └─────────────────────────┘ └───────────────────────┘ │
│ │
└────────────────────────────────────────────────────────────┘
Specific styling:

Countdown "316 days" → font-family: var(--font-display), font-size: 52px, font-weight: 400, color: rgba(255,255,255,0.95), letter-spacing: -0.03em
"until GATE 2027" → font-size: 16px, color: rgba(255,255,255,0.4), font-family: var(--font-body)
Quote → font-size: 13px, color: rgba(255,255,255,0.45), font-style: italic, border-left: 2px solid rgba(255,255,255,0.15), padding-left: 12px
All cards → className="liquid-glass", border-radius: 16px, padding: 18px 20px
Card section titles → font-size: 10px, letter-spacing: 0.12em, color: rgba(255,255,255,0.3), text-transform: uppercase
Card content text → font-size: 13px, color: rgba(255,255,255,0.8), font-family: var(--font-body)
Stat numbers → font-family: var(--font-mono), font-size: 28px, font-weight: 600
Generous whitespace — gap: 16px between all elements, padding: 28px on main content area

PART 7 — All other pages (Calendar, Subjects, Mock Tests, Analytics, Achievements, Settings)
Apply the same visual treatment to every page:

Page title at top: font-family: var(--font-display), font-size: 36px, color: rgba(255,255,255,0.9)
All cards, panels, modals, day panels, form inputs → .liquid-glass class
Form inputs: background: rgba(255,255,255,0.06), border: 1px solid rgba(255,255,255,0.12), color: rgba(255,255,255,0.9), border-radius: 8px, padding: 8px 12px
Form input focus: border-color: rgba(255,255,255,0.3), outline: none
Buttons (primary): background: rgba(249,115,22,0.85), backdrop-filter: blur(8px), color: white, border-radius: 8px, border: 1px solid rgba(249,115,22,0.4)
Buttons (secondary): .liquid-glass class, color: rgba(255,255,255,0.7), border-radius: 8px
Table rows: border-bottom: 1px solid rgba(255,255,255,0.06)
Modal overlays: background: rgba(0,0,0,0.5), backdrop-filter: blur(4px)

PART 8 — Profile panel
The profile panel (currently opens from sidebar avatar) now opens from the avatar in the top nav. Apply .liquid-glass-strong to the panel itself. Keep all existing functionality intact.

PART 9 — XP / Level display
Since sidebar is removed, show XP and level in a compact pill in the top nav between the nav links and the countdown:
jsx<div className="liquid-glass" style={{
  padding: '4px 12px',
  borderRadius: '20px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
}}>
<span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
Lv 1
</span>

  <div style={{ width: '48px', height: '2px', background: 'rgba(255,255,255,0.1)', borderRadius: '1px' }}>
    <div style={{ width: '16%', height: '100%', background: '#F97316', borderRadius: '1px' }} />
  </div>
  <span style={{ fontSize: '10px', color: '#F97316', fontFamily: 'var(--font-mono)' }}>82 XP</span>
</div>

PART 10 — Login page
Apply the same video background + glassmorphic card to the login page:

Fullscreen video background (same video)
Centered .liquid-glass-strong card, border-radius: 20px, padding: 40px, max-width: 400px
Title: "GATE CS TRACKER" in var(--font-display), large
All inputs and buttons follow Part 7 styles

IMPORTANT RULES:

Do NOT remove or change any Firestore reads/writes, auth logic, gamification logic, cascade shift, task system, or any other functional code
Do NOT change any component's data flow — only its visual presentation
The video must play on all pages — it is a fixed background at z-index: 0
All interactive elements must remain clearly visible and usable — glass effect should never make text unreadable
Mobile: top nav collapses to a hamburger menu on screens below 768px. Tapping hamburger shows a .liquid-glass dropdown with all nav links
npm run build must pass with zero errors after all changes
Test every page after applying — if any page has unreadable text due to low contrast with the video, increase the glass opacity slightly: background: rgba(255,255,255,0.08) instead of 0.01
