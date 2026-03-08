# NeoConnect — Frontend Roadmap

> **Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui  
> **Backend base URL:** `http://localhost:5001`  
> **Verification goal:** Every phase ends with a runnable, testable slice of the app.

---

## Phase 0 — Project Scaffolding

**Goal:** A blank Next.js app that connects to the backend and has the design system ready.

### Steps

1. **Bootstrap the project**
   ```bash
   cd /Users/zenith/neo-event
   npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir
   cd frontend
   ```

2. **Install shadcn/ui**
   ```bash
   npx shadcn@latest init
   ```
   Choose: `Default` style, `slate` base colour, CSS variables `yes`.

3. **Add essential shadcn components upfront**
   ```bash
   npx shadcn@latest add button input label form card badge select textarea toast dialog table tabs skeleton alert
   ```

4. **Install supporting packages**
   ```bash
   npm install axios zustand react-hook-form @hookform/resolvers zod
   npm install recharts          # charts in Phase 6
   npm install lucide-react      # icons (already bundled with shadcn but explicit)
   ```

5. **Create `src/lib/axios.ts`** — a pre-configured Axios instance  
   - `baseURL` = `http://localhost:5001`  
   - Request interceptor: reads token from `localStorage`, adds `Authorization: Bearer <token>` header.

6. **Create `src/lib/constants.ts`** — re-export all enums from `frontend_implementation.md` (Role, Status, Category, Severity, FeedbackType).

7. **Global env file**  
   Create `frontend/.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5001
   ```

### Verify Phase 0 ✅
- `npm run dev` starts without errors on `http://localhost:3000`.
- Axios instance imported in browser console without TypeScript errors.
- shadcn `Button` renders on the default page.

---

## Phase 1 — Authentication

**Goal:** Users can register, log in, and stay logged in across refreshes. Protected routes redirect unauthenticated users to `/login`.

### Files to create

```
src/
├── store/
│   └── authStore.ts              ← Zustand store (token + user)
├── lib/
│   └── auth.ts                   ← login(), register(), getMe() API helpers
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx            ← Minimal centered layout
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   └── (dashboard)/
│       └── layout.tsx            ← Auth guard: redirects to /login if no token
```

### Implementation details

| Item | Detail |
|------|--------|
| `authStore.ts` | Zustand store holding `{ token, user, setAuth, clearAuth }`. On mount, reads token from `localStorage` and re-fetches `GET /api/auth/me` to rehydrate user. |
| **Login page** | Email + password form → `POST /api/auth/login` → stores token → redirects to `/dashboard`. |
| **Register page** | Name, email, password, optional department + role → `POST /api/auth/register` → auto-login on success. |
| **Auth guard** | `(dashboard)/layout.tsx` checks `authStore.token` on mount. If none, `router.replace('/login')`. |
| **Zod schemas** | `loginSchema`, `registerSchema` for client-side validation (used with `react-hook-form`). |
| **Role-aware redirect** | After login, redirect based on role: `STAFF/CASE_MANAGER → /submissions`, `SECRETARIAT/ADMIN → /submissions` (inbox). |

### Verify Phase 1 ✅
- [ ] Register a new `STAFF` user → redirected to dashboard.
- [ ] Log out (clear token) → navigating to `/submissions` redirects to `/login`.
- [ ] Refresh the page while logged in → user stays logged in, no flicker.
- [ ] Wrong credentials → error message shown under form.

---

## Phase 2 — Submission Form (Create a Case)

**Goal:** Any authenticated user can fill out and submit a feedback/complaint form with file upload.

### Files to create

```
src/
├── lib/
│   └── submissions.ts            ← API helpers (createSubmission, getSubmissions, getById …)
├── app/
│   └── (dashboard)/
│       └── submissions/
│           └── new/
│               └── page.tsx      ← The submission form
```

### Implementation details

| Item | Detail |
|------|--------|
| **Form fields** | Title, Description (textarea), Type (FEEDBACK/COMPLAINT), Category (select), Department, Location, Severity (LOW/MEDIUM/HIGH), Anonymous toggle (Switch), Attachment (file input — image/PDF ≤ 5 MB). |
| **Submission** | Build a `FormData` object; send via `POST /api/submissions` with `Content-Type: multipart/form-data`. |
| **Tracking ID display** | On success (201), extract `data.trackingId` and show it in a `Dialog` or `Alert`: *"Your case has been submitted. Tracking ID: NEO-2026-001"*. |
| **Anonymous toggle** | When on, pass `isAnonymous: "true"` (string) in FormData. |
| **File validation** | Client-side: reject files > 5 MB before sending. Show filename + size once selected. |
| **Zod schema** | `submissionSchema` — all required fields, file size guard. |

### Verify Phase 2 ✅
- [ ] Submit a complaint → 201 response, tracking ID displayed.
- [ ] Submit without required fields → validation errors shown inline.
- [ ] Attach a PDF > 5 MB → client-side error fires before any network call.
- [ ] Anonymous toggle hidden → `submittedBy` is null in DB (confirm in Prisma Studio or API response).

---

## Phase 3 — Submissions List & Case Detail

**Goal:** All roles can view their relevant submissions. Secretariat/Admin can assign and update. Case Manager can update status and add notes.

### Files to create

```
src/
├── components/
│   ├── submissions/
│   │   ├── SubmissionCard.tsx     ← Single card for list view
│   │   ├── StatusBadge.tsx        ← Colour-coded badge per status
│   │   ├── SeverityBadge.tsx
│   │   └── AssignCaseManager.tsx  ← Dropdown + PATCH /api/submissions/:id
├── app/
│   └── (dashboard)/
│       └── submissions/
│           ├── page.tsx           ← List / Inbox
│           └── [id]/
│               └── page.tsx       ← Case detail
```

### Implementation details

**List page (`/submissions`)**

| Role | What they see |
|------|--------------|
| STAFF | Their own submissions only |
| CASE_MANAGER | Submissions assigned to them |
| SECRETARIAT / ADMIN | Full inbox — all submissions |

- Render `SubmissionCard` for each item: title, `trackingId`, status badge, severity badge, date, `_count.comments`.
- Link each card to `/submissions/[id]`.
- Add `+ New Case` button for all roles.

**Detail page (`/submissions/[id]`)**

- Full case info: all fields, submitted by (or "Anonymous"), assigned to.
- **Status update select** — shown for `CASE_MANAGER`, `SECRETARIAT`, `ADMIN`. `PATCH /api/submissions/:id` with `{ status }`.
- **Assign dropdown** — shown only for `SECRETARIAT` / `ADMIN`. Fetches `GET /api/auth/users?role=CASE_MANAGER` (if endpoint exists) or a locally maintained list. `PATCH /api/submissions/:id` with `{ assignedToId }`.
- **Comments section** — list of comments + a textarea + submit button. `POST /api/submissions/:id/comments`. Hidden for `STAFF`.
- **Attachment** — if `data.attachment` exists, render a link: `http://localhost:5001 + data.attachment`.
- **Delete button** — shown only for `ADMIN`. `DELETE /api/submissions/:id` → redirect to `/submissions`.

### Verify Phase 3 ✅
- [ ] Log in as `STAFF` — only own submissions visible.
- [ ] Log in as `SECRETARIAT` — full inbox visible; can assign a case to a Case Manager.
- [ ] Log in as `CASE_MANAGER` — only assigned cases visible; can change status and add comment.
- [ ] Log in as `ADMIN` — can delete a case.
- [ ] Assigning to a non-`CASE_MANAGER` user returns 400 (verify in network tab).
- [ ] Attached file renders as a downloadable link.

---

## Phase 4 — Public Hub

**Goal:** Any authenticated user can browse resolved case summaries, the impact table, and meeting minutes (with upload for Secretariat/Admin).

### Files to create

```
src/
├── lib/
│   └── public.ts                 ← API helpers for public hub
├── app/
│   └── (dashboard)/
│       └── public-hub/
│           ├── page.tsx          ← Quarterly Digest (blog cards)
│           ├── impact/
│           │   └── page.tsx      ← Impact tracking table
│           └── minutes/
│               └── page.tsx      ← Meeting minutes archive + upload form
```

### Implementation details

**Quarterly Digest (`/public-hub`)**

- `GET /api/public/resolved-cases` → render cards using `title` + `description`.
- Group by quarter using `createdAt` date (e.g., *Q1 2026*).

**Impact Table (`/public-hub/impact`)**

- Same endpoint — render as a `<Table>`:
  | Tracking ID | What Was Raised (`title`) | Action Taken (`last comment.body`) | Date Resolved |

**Minutes Archive (`/public-hub/minutes`)**

- `GET /api/public/minutes` → list of PDF cards with title, date, and a *View PDF* link (`http://localhost:5001 + fileUrl`).
- **Upload form** (SECRETARIAT/ADMIN only): Title field + file input (PDF only) → `POST /api/public/minutes` as `multipart/form-data`.

### Verify Phase 4 ✅
- [ ] `/public-hub` shows resolved case cards.
- [ ] `/public-hub/impact` shows table — last comment body appears in "Action Taken" column.
- [ ] Log in as `SECRETARIAT` → upload a PDF minute → it appears in the list.
- [ ] Log in as `STAFF` → upload form is **not** shown.
- [ ] PDF link opens/downloads correctly in the browser.

---

## Phase 5 — Polling System

**Goal:** Secretariat/Admin can create polls; all authenticated users can vote once and see live results.

### Files to create

```
src/
├── lib/
│   └── polls.ts                  ← API helpers (getPolls, createPoll, vote)
├── components/
│   └── polls/
│       ├── PollCard.tsx          ← Single poll: question + options
│       └── PollResultBar.tsx     ← Horizontal bar showing vote %
├── app/
│   └── (dashboard)/
│       └── polls/
│           ├── page.tsx          ← List all polls
│           └── new/
│               └── page.tsx      ← Create poll (SECRETARIAT/ADMIN only)
```

### Implementation details

**Polls list (`/polls`)**

| State | Display |
|-------|---------|
| `userVotedOptionId === null` | Show radio buttons / vote buttons for each option |
| `userVotedOptionId !== null` | Hide buttons; show `PollResultBar` with %, highlight user's choice |

- `GET /api/polls` on mount.
- Vote: `POST /api/polls/:pollId/vote` with `{ optionId }`.
- On 409 (already voted) show a toast: *"You have already voted on this poll."*

**Create poll (`/polls/new`)**

- `SECRETARIAT` / `ADMIN` only (redirect others).
- Question field + dynamic option inputs (minimum 2, add/remove rows).
- Submit → `POST /api/polls` → redirect to `/polls`.

### Verify Phase 5 ✅
- [ ] Log in as `STAFF` → `/polls/new` redirects away.
- [ ] Log in as `ADMIN` → create a poll with 3 options → appears in list.
- [ ] Vote on a poll → buttons replaced with result bars.
- [ ] Vote again on same poll → toast "already voted" shown, no second vote recorded.
- [ ] Two different user accounts vote → vote count increases correctly.

---

## Phase 6 — Analytics Dashboard

**Goal:** Secretariat/Admin can see charts and hotspot alerts. All other roles are redirected.

### Files to create

```
src/
├── lib/
│   └── analytics.ts              ← API helper: getAnalytics()
├── components/
│   └── analytics/
│       ├── StatusDoughnut.tsx    ← Recharts PieChart
│       ├── DepartmentBarChart.tsx← Recharts BarChart (openCasesByDepartment)
│       ├── CategoryBarChart.tsx  ← Recharts BarChart (byCategory)
│       └── HotspotCard.tsx       ← Warning card for hotspot entries
├── app/
│   └── (dashboard)/
│       └── analytics/
│           └── page.tsx
```

### Implementation details

- `GET /api/analytics` on mount (role guard: redirect non-ADMIN/SECRETARIAT).
- **Status Doughnut** — `recharts` `PieChart` using `byStatus`. Colour-map each status (e.g., NEW = blue, ESCALATED = red).
- **Open Cases Bar Chart** — `BarChart` using `openCasesByDepartment`. X-axis = department, Y-axis = count.
- **Category Breakdown** — separate `BarChart` or `Table` for `byCategory`.
- **Hotspots** — if `hotspots.length > 0`, render `HotspotCard` per entry with a warning icon and `"{department} / {category}: {count} cases"`.
- Wrap all charts in `Skeleton` while loading.

### Verify Phase 6 ✅
- [ ] Log in as `STAFF` → `/analytics` redirects away.
- [ ] Log in as `SECRETARIAT` → all charts render with real data.
- [ ] Submit 5+ cases in the same dept+category → hotspot card appears.
- [ ] `byStatus` doughnut reflects actual status counts.

---

## Phase 7 — Navigation, Layout & Polish

**Goal:** The app feels complete — navigation, loading/error states, responsive design, toast feedback.

### Steps

1. **Sidebar / Navbar with role-aware links**
   ```
   All roles:       Submissions, Public Hub, Polls
   CASE_MANAGER:   + (no extras beyond role-filtered views)
   SECRETARIAT:    + Analytics, Upload Minutes
   ADMIN:          + Analytics, Upload Minutes
   ```

2. **Global toast setup** — add `<Toaster />` from shadcn to `app/layout.tsx`; use `toast()` for success/error feedback on every API mutation.

3. **Loading skeletons** — replace raw `null` states with `<Skeleton>` components on all list/detail pages.

4. **Empty states** — when a list returns `[]`, show a helpful message (e.g., *"No cases yet — submit the first one."*).

5. **Global error boundary** — `error.tsx` in `app/(dashboard)/` for unexpected crashes.

6. **Responsive design check** — ensure sidebar collapses to a hamburger on mobile; forms stack vertically on small screens.

7. **Environment file audit** — ensure `NEXT_PUBLIC_API_URL` is the only hardcoded config; no secrets in client code.

### Verify Phase 7 ✅
- [ ] Navigate all pages — no broken links, no console errors.
- [ ] All API mutations show a toast on success and on failure.
- [ ] Open the app on a 375 px (mobile) viewport — no horizontal overflow.
- [ ] Unauthenticated visit to any `/dashboard` route → redirected to `/login`.
- [ ] Sidebar shows only role-appropriate links.

---

## Summary Table

| Phase | Feature | Key Endpoints | Verify Signal |
|-------|---------|--------------|---------------|
| 0 | Scaffolding | — | `npm run dev` starts |
| 1 | Auth | `/auth/register` `/auth/login` `/auth/me` | Login persists on refresh |
| 2 | Submission form | `POST /submissions` | Tracking ID displayed on submit |
| 3 | Submissions list + detail | `GET/PATCH/DELETE /submissions` `POST /comments` | Role-filtered inbox + assign + comment |
| 4 | Public Hub | `/public/resolved-cases` `/public/minutes` | PDF upload + impact table |
| 5 | Polls | `GET/POST /polls` `POST /polls/:id/vote` | One vote per user, live results |
| 6 | Analytics | `GET /analytics` | Charts + hotspot cards render |
| 7 | Nav + polish | — | Full responsive app, toasts, empty states |

---

## Running Everything Together

```bash
# Terminal 1 — backend
cd /Users/zenith/neo-event/backend && npm run dev

# Terminal 2 — frontend
cd /Users/zenith/neo-event/frontend && npm run dev
```

Open `http://localhost:3000`.  
Backend API available at `http://localhost:5001`.
