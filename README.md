# Employee Copilot

A zero-dependency, offline-capable work hub built in vanilla JS. Two surfaces — a **desktop web app** (Slack-style) and a **mobile PWA** — that share the same data layer and stay in sync through a single localStorage key.

---

## Architecture

```
AI copilot/
├── shared/
│   └── data.js              ← single source of truth
├── employee-copilot-web/    ← desktop Slack-style app
│   ├── index.html
│   ├── app.js
│   └── styles.css
└── employee-copilot-pwa/    ← mobile PWA
    ├── index.html
    ├── app.js
    ├── styles.css
    ├── service-worker.js
    └── manifest.webmanifest
```

### How the pieces connect

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser / Device                        │
│                                                                 │
│   ┌──────────────────────┐      ┌──────────────────────────┐   │
│   │  employee-copilot-   │      │  employee-copilot-pwa/   │   │
│   │  web/  (desktop)     │      │  (mobile PWA)            │   │
│   │                      │      │                          │   │
│   │  index.html          │      │  index.html              │   │
│   │  styles.css          │      │  styles.css              │   │
│   │  app.js              │      │  app.js                  │   │
│   │                      │      │  service-worker.js       │   │
│   │  3-column Slack UI   │      │  manifest.webmanifest    │   │
│   │  sidebar / main /    │      │  tab-based mobile UI     │   │
│   │  detail panel        │      │  installable offline     │   │
│   └──────────┬───────────┘      └────────────┬─────────────┘   │
│              │  window.CopilotData            │                 │
│              └──────────────┬─────────────────┘                 │
│                             │                                   │
│               ┌─────────────▼─────────────┐                    │
│               │     shared/data.js         │                    │
│               │                            │                    │
│               │  Mock tasks, channels,     │                    │
│               │  DMs, chat history         │                    │
│               │  Color maps (dept/priority)│                    │
│               │  Date/week helpers         │                    │
│               │  enrichTask() pure fn      │                    │
│               │  loadPersisted()           │                    │
│               │  persist()                 │                    │
│               └─────────────┬─────────────┘                    │
│                             │                                   │
│               ┌─────────────▼─────────────┐                    │
│               │  localStorage              │                    │
│               │  key: employeeCopilot.v1   │                    │
│               │                            │                    │
│               │  {                         │                    │
│               │    completedTasks: {},     │                    │
│               │    extraTasks: [],         │                    │
│               │    nextId: 13,             │                    │
│               │    activeTab: 'today'      │                    │
│               │  }                         │                    │
│               └────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

### Data flow

```
User action (click / keypress)
        │
        ▼
Event delegation  ──  document.addEventListener('click')
  (data-action attr)       single listener, no per-element handlers
        │
        ▼
   setState(patch)
        │
        ├──▶  Object.assign(state, patch)
        │
        ├──▶  CD.persist({ completedTasks, extraTasks, nextId, activeTab })
        │         └──▶  localStorage.setItem('employeeCopilot.v1', JSON)
        │
        └──▶  render()
                  ├── renderSidebarNav()
                  ├── renderSidebarChannels()
                  ├── renderSidebarDMs()
                  ├── renderProfile()
                  ├── renderTopbarAndContent()
                  │       ├── renderTodayContent()   (activeView = 'today')
                  │       ├── renderWeekContent()    (activeView = 'week')
                  │       └── renderChatContent()    (activeChat != null)
                  └── renderDetailPanel()
```

### PWA offline strategy (mobile only)

```
  Request
     │
     ▼
Cache match?
  ├── YES ──▶ return cached, fetch update in background
  └── NO  ──▶ fetch from network
                  ├── success ──▶ return + update cache
                  └── fail    ──▶ return cached (offline fallback)
```

---

## Key design decisions

**Shared data module** — `shared/data.js` exposes `window.CopilotData`. Both apps load it first, so they always agree on task IDs, color maps, and the storage schema. No API, no build step, no drift.

**Single localStorage key** — both apps read and write `employeeCopilot.v1` with the same JSON shape. Completing a task in the web app is immediately reflected when the mobile app next reads state.

**No framework, no bundler** — vanilla JS with a global `state` object and a `setState → persist → render` cycle. The entire render is a synchronous string-concat → `innerHTML` swap. Fast, debuggable, zero dependencies.

**Event delegation** — one `click` listener on `document`, dispatched via `data-action` attributes. No per-element listeners to clean up, no memory leaks across re-renders.

**`enrichTask()` pure function** — takes a raw task + `completedTasks` map, returns display-ready fields (colors, done state, AI priority flag). Both apps call the same function, so styling is always consistent.

---

## Running locally

No build step required — open the files directly in a browser.

**Desktop web app:**
```
open employee-copilot-web/index.html
```

**Mobile PWA** (needs a local server for the service worker):
```bash
cd "AI copilot"
npx serve .          # or python3 -m http.server 8080
# open http://localhost:8080/employee-copilot-pwa/
```

To install as a PWA: open in Chrome/Edge on mobile → browser menu → "Add to Home Screen".

---

## Pushing to Git

Initialize a repo at the **root** (`AI copilot/`), not inside a sub-folder — both apps reference `../shared/data.js` and need to live in the same repo.

```bash
cd "C:\Users\<you>\Documents\Claude\Projects\AI copilot"
git init
git add .
git commit -m "Initial commit — Employee Copilot web + mobile"
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

---

## Tech stack at a glance

| Layer | Web app | Mobile PWA |
|---|---|---|
| UI | Vanilla JS + innerHTML | Vanilla JS + innerHTML |
| Styling | CSS variables, Flexbox | CSS variables, Flexbox |
| State | Global `state` object | Global `state` object |
| Persistence | `shared/data.js` → localStorage | `shared/data.js` → localStorage |
| Offline | — | Service Worker (cache-first) |
| Install | Browser tab | PWA / Add to Home Screen |
| Build | None | None |
| Dependencies | None | None |
