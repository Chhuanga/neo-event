# NeoConnect — Project Guidelines
**Staff Feedback & Complaint Management Platform**
`Individual` · `4 Hours` · `Full Stack Challenge`

---

## 1. Project Overview

NeoConnect is a staff feedback and complaint management platform where employees can raise issues, vote on polls, and track how management responds. It must feel transparent, accountable, and easy to use.

| Attribute | Detail |
|-----------|--------|
| Format | Individual |
| Time Limit | 4 hours — strict, late submissions not evaluated |
| Deliverable | Working app with source code pushed to provided repository |
| Tech Stack | Next.js + Express.js + MongoDB + JWT |

---

## 2. What We MUST Build ✅

### 2.1 Submission Form (Staff)

| Field / Feature | Requirement |
|-----------------|-------------|
| Category | Safety, Policy, Facilities, HR, Other |
| Department | Required field |
| Location | Required field |
| Severity | Low / Medium / High |
| Anonymous Toggle | Hides submitter identity when enabled |
| File Upload | Attach a photo or PDF |
| Tracking ID | Auto-generated in format `NEO-YYYY-001` |

### 2.2 Case Management (Secretariat & Case Manager)

| Feature | Who | Requirement |
|---------|-----|-------------|
| Inbox view of all cases | Secretariat | Shows all incoming submissions |
| Assign case to Case Manager | Secretariat | Dropdown or search to assign |
| View own assigned cases | Case Manager | Filtered view for their cases only |
| Update case status | Case Manager | Must use the 6 defined statuses |
| Add notes / responses | Case Manager | Free-text notes on each case |
| Close a case | Case Manager | Marks case as Resolved |
| 7-day escalation rule | System | Auto-escalate + send reminder if no response in 7 working days |

### 2.3 Case Lifecycle — Required Statuses

| Status | Meaning |
|--------|---------|
| `New` | Just submitted, not yet reviewed |
| `Assigned` | Secretariat has assigned it to a Case Manager |
| `In Progress` | Case Manager is actively working on it |
| `Pending` | Waiting for more information from the staff member |
| `Resolved` | Case addressed and closed |
| `Escalated` | 7-day rule triggered — Management has been alerted |

### 2.4 Public Hub (Visible to All Staff)

| Feature | Description |
|---------|-------------|
| Quarterly Digest | Blog-style page showing summaries of resolved cases |
| Impact Tracking Table | What was raised → Action taken → What changed |
| Minutes Archive | Searchable list of uploaded meeting PDFs |

### 2.5 Polling System

- Secretariat can create polls with a question and multiple answer options
- Each staff member can vote only once per poll
- Results displayed as a chart after the user has voted

### 2.6 Analytics Dashboard (Secretariat & Admin)

- Heatmap or bar chart showing which departments have the most open cases
- Case counts broken down by status, category, and department
- **Hotspot flagging:** if 5+ cases from the same department share the same category, highlight it

### 2.7 Authentication (All Roles)

- JWT-based login — users stay logged in after a page refresh
- Every API route must check the user's role before granting access
- Four roles enforced: `Staff`, `Secretariat/Management`, `Case Manager`, `Admin (IT)`

---

## 3. What We Do NOT Build 🚫

| Item | Note |
|------|------|
| Email / SMS notifications | Simulate escalation within the app only |
| Real-time push / websockets | Polling or page refresh is sufficient |
| Mobile app (iOS / Android) | Web app only — responsive design is enough |
| OAuth / social login | JWT-based auth only, as specified |
| Multi-tenant / multi-company support | Single organisation only |
| Payment or billing features | No commercial features in scope |
| Replacing shadcn/ui | Must use shadcn/ui for UI components |
| Swapping the tech stack | Ask an organiser before changing any listed technology |
| Rich-text / WYSIWYG editor | Plain text inputs are sufficient |
| Advanced search / full-text indexing | Basic filtering is enough |
| Automated unit / integration tests | No testing suite required |
| CI/CD pipeline or containerisation | App just needs to run locally |
| Hardcoded secrets | Use `.env.example` — never commit secrets |

---

## 4. Required Tech Stack

> Use these exactly as listed. Ask an organiser before swapping anything.

### Frontend

| Technology | Purpose |
|------------|---------|
| Next.js | Main framework — JavaScript or TypeScript |
| React | UI components |
| Tailwind CSS | ALL styling — no other CSS frameworks |
| shadcn/ui | Buttons, modals, forms — must use this |

### Backend

| Technology | Purpose |
|------------|---------|
| Node.js | Server runtime |
| Express.js | API routes and server logic |
| MongoDB + Mongoose | Primary database (PostgreSQL/MySQL allowed if more comfortable) |
| JWT | Authentication — persists across page refresh |

### Optional Animations *(keep subtle — pick one only)*

- Framer Motion
- GSAP

---

## 5. Key Rules & Constraints

| Rule | Detail |
|------|--------|
| Write all code during the session | No pre-written templates or copied projects |
| App must run locally | Write clear setup instructions in `README.md` |
| `.env.example` required | All secrets go here — no hardcoding MongoDB URI, JWT secret, etc. |
| Extra libraries allowed | For charts, date pickers, etc. — but must not replace shadcn/ui |
| Code walkthrough | An organiser may ask you to walk through your code |

---

## 6. Suggested Build Priority

Given the 4-hour limit, tackle features in this order:

| # | Feature | Why First |
|---|---------|-----------|
| 1 | Auth + User Roles | Everything depends on roles being in place |
| 2 | Submission Form + Tracking ID | Core of the product |
| 3 | Case Inbox + Assignment | Key Secretariat workflow |
| 4 | Case Status Updates + 7-Day Rule | Core Case Manager workflow |
| 5 | Public Hub | Impact & digest visibility |
| 6 | Polling System | Voting feature |
| 7 | Analytics Dashboard | Hotspot flagging — build last |

---

## 7. Quick Reference Summary

### ✅ Build This
- Submission form with `NEO-YYYY-001` tracking IDs
- Anonymous toggle + file upload
- Case inbox + assignment (Secretariat)
- Case status updates + notes (Case Manager)
- 7-day auto-escalation rule
- Public Hub: digest, impact table, minutes archive
- Polls: create, vote once, show chart
- Analytics: heatmap + hotspot flagging
- JWT auth with role-based route protection
- `.env.example` with all required secrets

### 🚫 Skip This
- Email / SMS notifications
- Real-time websockets
- Mobile app
- OAuth / social login
- Multi-tenant support
- Replacing shadcn/ui or swapping the tech stack
- WYSIWYG editor
- Unit / integration tests
- CI/CD or Docker setup
- Hardcoded environment secrets

---

*Build fast. Build clean. Good luck!*