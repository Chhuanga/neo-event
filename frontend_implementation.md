# NeoConnect — Frontend Implementation Guide

> Base URL: `http://localhost:5001`  
> All protected endpoints require `Authorization: Bearer <token>` in the request header.  
> Store the JWT token in `localStorage` or a cookie on login and attach it to every API call.

---

## Auth Context (Global)

Store the following in your auth context / Zustand store / React Context:

```ts
{
  token: string | null
  user: {
    id: string
    name: string
    email: string
    role: "ADMIN" | "SECRETARIAT" | "CASE_MANAGER" | "STAFF"
    department?: string
  } | null
}
```

Use `GET /api/auth/me` on app load to rehydrate the user from a stored token.

---

## 1. Authentication Pages

### 1.1 Register Page — `POST /api/auth/register`

```ts
// Request body (JSON)
{
  name: string
  email: string
  password: string
  department?: string
  role?: "ADMIN" | "SECRETARIAT" | "CASE_MANAGER" | "STAFF" // defaults to STAFF
}

// Success response (201)
{
  success: true,
  data: { id, name, email, role, department, createdAt }
}

// Error (409) — Email already in use
```

### 1.2 Login Page — `POST /api/auth/login`

```ts
// Request body (JSON)
{
  email: string
  password: string
}

// Success response (200)
{
  success: true,
  token: "eyJhbGci...",        // ← Store this in localStorage
  data: { id, name, email, role }
}

// Error (401) — Invalid credentials
```

### 1.3 Get Current User — `GET /api/auth/me`

```ts
// Headers: Authorization: Bearer <token>
// No body

// Success response (200)
{
  success: true,
  data: { id, name, email, role, department, createdAt }
}
```

---

## 2. Submissions (Tickets)

### 2.1 Create Submission — `POST /api/submissions`

> ⚠️ Send as **`multipart/form-data`** (not JSON) because of the file upload.

```ts
// Form fields
title: string
description: string
type: "FEEDBACK" | "COMPLAINT"
category: "SAFETY" | "POLICY" | "FACILITIES" | "HR" | "OTHER"
department: string
location: string
severity: "LOW" | "MEDIUM" | "HIGH"
isAnonymous: "true" | "false"          // send as string in form-data
attachment?: File                      // image or PDF, max 5MB

// Success response (201)
{
  success: true,
  data: {
    id, trackingId, title, description, type, category,
    department, location, severity, status, attachment,
    isAnonymous, createdAt, updatedAt,
    submittedById
  }
}
```

### 2.2 Get All Submissions — `GET /api/submissions`

```ts
// Role-based filtering (automatic, no query params needed):
// ADMIN / SECRETARIAT → all submissions (full inbox)
// CASE_MANAGER        → only submissions assigned to them
// STAFF               → only their own submissions

// Success response (200)
{
  success: true,
  data: [
    {
      id, trackingId, title, description, type, category,
      department, location, severity, status, attachment,
      isAnonymous, createdAt, updatedAt,
      submittedBy: { id, name, email } | null,
      assignedTo:  { id, name, email } | null,
      _count: { comments: number }
    }
  ]
}
```

### 2.3 Get Submission by ID — `GET /api/submissions/:id`

```ts
// Success response (200)
{
  success: true,
  data: {
    id, trackingId, title, description, type, category,
    department, location, severity, status, attachment,
    isAnonymous, createdAt, updatedAt,
    submittedBy: { id, name, email } | null,
    assignedTo:  { id, name, email } | null,
    comments: [
      {
        id, body, createdAt, updatedAt,
        author: { id, name }
      }
    ]
  }
}
```

### 2.4 Update Submission — `PATCH /api/submissions/:id`

> Only `SECRETARIAT` / `ADMIN` can update `assignedToId`.  
> Only `CASE_MANAGER`, `SECRETARIAT`, `ADMIN` can update `status`.  
> Secretariat can only assign to users with `CASE_MANAGER` role.

```ts
// Request body (JSON) — all fields optional
{
  status?: "NEW" | "ASSIGNED" | "IN_PROGRESS" | "PENDING" | "RESOLVED" | "ESCALATED"
  severity?: "LOW" | "MEDIUM" | "HIGH"
  assignedToId?: string   // must be a CASE_MANAGER user's ID
}

// Success response (200)
{ success: true, data: { ...updatedSubmission } }

// Error (400) — assignedToId target is not a CASE_MANAGER
// Error (403) — insufficient role
```

### 2.5 Delete Submission — `DELETE /api/submissions/:id`

> `ADMIN` only.

```ts
// Success response (200)
{ success: true, message: "Submission deleted" }
```

### 2.6 Add Comment / Note — `POST /api/submissions/:submissionId/comments`

> Roles: `CASE_MANAGER` (assigned only), `SECRETARIAT`, `ADMIN`.

```ts
// Request body (JSON)
{ body: string }

// Success response (201)
{
  success: true,
  data: { id, body, submissionId, authorId, createdAt, updatedAt }
}

// Error (403) — CASE_MANAGER not assigned to that submission
// Error (404) — Submission not found
```

### 2.7 Trigger Escalation — `POST /api/submissions/escalate`

> No auth required. Call this from a scheduled task / cron on the frontend or server.  
> Auto-escalates any submission not updated in 7+ days.

```ts
// No body

// Success response (200)
{ success: true, escalatedCount: number }
```

---

## 3. Polls

### 3.1 Create Poll — `POST /api/polls`

> Roles: `ADMIN`, `SECRETARIAT` only.

```ts
// Request body (JSON)
{
  question: string,
  options: string[]   // min 2 items, e.g. ["Option A", "Option B", "Option C"]
}

// Success response (201)
{
  success: true,
  data: {
    id, question, createdAt, updatedAt,
    options: [{ id, text, pollId }]
  }
}

// Error (400) — less than 2 options provided
```

### 3.2 Get All Polls — `GET /api/polls`

> All authenticated users. Response includes vote counts and whether the current user has voted.

```ts
// Success response (200)
{
  success: true,
  data: [
    {
      id: string,
      question: string,
      createdAt: string,
      options: [
        {
          id: string,
          text: string,
          votes: number        // total votes on this option
        }
      ],
      userVotedOptionId: string | null   // null = user hasn't voted yet
    }
  ]
}
```

> **Frontend tip:** If `userVotedOptionId` is `null`, show the voting buttons.  
> If it has a value, show results/chart only and highlight the user's chosen option.

### 3.3 Vote on Poll — `POST /api/polls/:pollId/vote`

> Each user can vote only **once** per poll.

```ts
// Request body (JSON)
{ optionId: string }   // must belong to that pollId

// Success response (201)
{ success: true, data: { id, userId, pollId, pollOptionId, createdAt } }

// Error (409) — Already voted
// Error (404) — Option not found for this poll
```

---

## 4. Public Hub

### 4.1 Quarterly Digest & Impact Table — `GET /api/public/resolved-cases`

> All authenticated users. Returns only `RESOLVED` submissions with comments.

```ts
// Success response (200)
{
  success: true,
  data: [
    {
      id, trackingId, title, description,
      category, department, createdAt, updatedAt,
      comments: [
        { body: string, createdAt: string }
      ]
    }
  ]
}
```

> **Frontend tip:**  
> - **Quarterly Digest** → blog-style cards using `title` + `description`  
> - **Impact Tracking Table** → map `title` (What was raised) → last `comment.body` (Action taken / What changed)

### 4.2 Get Meeting Minutes — `GET /api/public/minutes`

```ts
// Success response (200)
{
  success: true,
  data: [
    { id, title, fileUrl, createdAt, updatedAt }
  ]
}
```

> `fileUrl` is a relative path like `/uploads/document-xxx.pdf`.  
> Build the full URL as: `http://localhost:5001` + `fileUrl`

### 4.3 Upload Meeting Minutes — `POST /api/public/minutes`

> Roles: `ADMIN`, `SECRETARIAT` only.  
> ⚠️ Send as **`multipart/form-data`**.

```ts
// Form fields
title: string
document: File   // PDF only

// Success response (201)
{ success: true, data: { id, title, fileUrl, createdAt, updatedAt } }
```

---

## 5. Analytics Dashboard

> Roles: `ADMIN`, `SECRETARIAT` only.

### `GET /api/analytics`

```ts
// Success response (200)
{
  success: true,
  data: {
    byStatus: [
      { status: "NEW" | "ASSIGNED" | "IN_PROGRESS" | "PENDING" | "RESOLVED" | "ESCALATED", count: number }
    ],
    byCategory: [
      { category: "SAFETY" | "POLICY" | "FACILITIES" | "HR" | "OTHER", count: number }
    ],
    byDepartment: [
      { department: string, count: number }
    ],
    openCasesByDepartment: [       // excludes RESOLVED — use this for the heatmap/bar chart
      { department: string, count: number }
    ],
    hotspots: [                    // flagged if 5+ cases share same dept + category
      { department: string, category: string, count: number }
    ]
  }
}
```

> **Frontend tip:**  
> - `openCasesByDepartment` → Bar chart (x = department, y = open case count)  
> - `byStatus` → Doughnut/pie chart  
> - `hotspots` → Render as highlighted warning cards/badges  

---

## 6. Role-Based UI Summary

| Feature | STAFF | CASE_MANAGER | SECRETARIAT | ADMIN |
|---------|-------|-------------|-------------|-------|
| Submit a case | ✅ | ✅ | ✅ | ✅ |
| View own cases | ✅ | — | — | — |
| View assigned cases | — | ✅ | — | — |
| View all cases (inbox) | — | — | ✅ | ✅ |
| Assign case to Case Manager | — | — | ✅ | ✅ |
| Update case status | — | ✅ | ✅ | ✅ |
| Add notes/comments | — | ✅ (assigned only) | ✅ | ✅ |
| Delete a case | — | — | — | ✅ |
| Create polls | — | — | ✅ | ✅ |
| Vote on polls | ✅ | ✅ | ✅ | ✅ |
| Upload meeting minutes | — | — | ✅ | ✅ |
| View public hub | ✅ | ✅ | ✅ | ✅ |
| View analytics dashboard | — | — | ✅ | ✅ |

---

## 7. Enums Reference

```ts
type Role       = "ADMIN" | "SECRETARIAT" | "CASE_MANAGER" | "STAFF"
type Status     = "NEW" | "ASSIGNED" | "IN_PROGRESS" | "PENDING" | "RESOLVED" | "ESCALATED"
type Category   = "SAFETY" | "POLICY" | "FACILITIES" | "HR" | "OTHER"
type Severity   = "LOW" | "MEDIUM" | "HIGH"
type FeedbackType = "FEEDBACK" | "COMPLAINT"
```

---

## 8. Suggested Page Structure (Next.js App Router)

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── (dashboard)/
│   ├── layout.tsx                  ← Protected layout, checks token
│   ├── page.tsx                    ← Redirect based on role
│   ├── submissions/
│   │   ├── page.tsx                ← Inbox / My cases list
│   │   ├── new/page.tsx            ← Submission form
│   │   └── [id]/page.tsx           ← Case detail + comments
│   ├── polls/
│   │   ├── page.tsx                ← List polls + vote
│   │   └── new/page.tsx            ← Create poll (SECRETARIAT/ADMIN)
│   ├── public-hub/
│   │   ├── page.tsx                ← Quarterly Digest
│   │   ├── impact/page.tsx         ← Impact tracking table
│   │   └── minutes/page.tsx        ← Meeting minutes archive
│   └── analytics/
│       └── page.tsx                ← Charts + Hotspots (SECRETARIAT/ADMIN)
```
