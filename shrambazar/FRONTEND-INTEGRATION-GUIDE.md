# ShramBazar Frontend Integration Guide

This guide is for clients integrating with the currently implemented Spring Boot API. Use `API-DOCUMENTATION.md` for the complete endpoint catalog and DTO field list.

## 1. Configure the client

Use the backend origin as an environment variable, for example:

```text
VITE_API_BASE_URL=http://localhost:8080
```

Send JSON with `Content-Type: application/json`. For authenticated calls, add `Authorization: Bearer <accessToken>`. Do not send a token for public job browsing or registration/login.

## 2. Registration, login, and token handling

The two registration forms are:

* `POST /api/auth/register/job-seeker`
* `POST /api/auth/register/job-provider`

Both return a token immediately. Provider registration includes business fields. If `hasBusiness` is true, the backend requires `businessName` and `businessLocation`.

```js
const response = await fetch(`${API}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password })
});
const auth = await response.json();
// auth: accessToken, tokenType, userId, fullName, email, role
```

The role is `JOB_SEEKER` or `JOB_PROVIDER`. Store the token and user metadata in the client’s authenticated session. Prefer an in-memory token plus a secure, application-appropriate persistence mechanism; never put the password in storage. Because the backend has no refresh-token endpoint, an expired token requires login again.

```js
function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}
```

Logout is `POST /api/auth/logout` with the Bearer token. The backend revokes that exact JWT, so discard it locally after a successful `204`. A missing/non-Bearer logout header returns `401`.

Password recovery is not available: `ForgotPasswordRequest` and `ResetPasswordRequest` classes exist, but no API routes implement them.

## 3. Role-based navigation and permissions

Use the returned role to select the initial dashboard, but treat the API response as authoritative. A `401` means the session is absent or invalid; clear local auth and route to login. A `403` means the account is authenticated but lacks the required role/ownership.

| UI area | Role |
|---|---|
| Public job list/details | Everyone |
| Seeker dashboard, profile, skills, qualifications, experience, availability, applications, saved jobs, seeker engagements | `JOB_SEEKER` |
| Provider dashboard/profile, jobs, applicants, worker search, provider engagements | `JOB_PROVIDER` |
| Reports | `JOB_SEEKER` or `JOB_PROVIDER` |
| Admin dashboard, verification review, reports/moderation, skill management | `ADMIN` in security rules |

Important current limitation: `ADMIN` is referenced in security annotations but is absent from the `UserRole` enum and public registration flow. Do not assume an admin login path is available until the backend resolves this.

## 4. Feature integrations

### Jobs and applications

Providers create jobs with `POST /api/provider/jobs`. A successful create is immediately `OPEN`; there is no separate publish call. Required fields include title, description, address, start/end dates, start/end times, payment amount/method, worker count, and optional required skill IDs.

```js
await fetch(`${API}/api/provider/jobs`, {
  method: "POST",
  headers: authHeaders(providerToken),
  body: JSON.stringify({
    title: "Event Helper",
    description: "Help prepare and serve at an event.",
    responsibilities: "Set up tables and assist guests.",
    address: "Bhrikutimandap",
    municipality: "Kathmandu",
    district: "Kathmandu",
    province: "Bagmati",
    startDate: "2026-12-10",
    endDate: "2026-12-10",
    startTime: "09:00:00",
    endTime: "17:00:00",
    durationDescription: "1 day",
    paymentAmount: 1500,
    paymentMethod: "CASH",
    requiredExperienceMonths: 0,
    numberOfWorkersRequired: 2,
    requiredSkillIds: [3, 7]
  })
});
```

Public clients can use `GET /api/jobs?keyword=event&district=Kathmandu&minPayment=500&workDate=2026-12-10`. Only open jobs are returned. Providers use their own job list, active paginated list, update, close, and cancel endpoints. The backend rejects invalid date/time ranges and duplicate/nonexistent skill IDs.

Seekers apply with an empty-body `POST /api/jobs/{jobId}/applications`. Show the returned `PENDING` application. Providers retrieve applicants and can reject pending applications or select them. A selected worker sees an `AWAITING_RESPONSE` engagement and must call confirm or decline.

### Engagement workflow

Render the following state transitions:

```text
Application: PENDING -> SELECTED
Application: PENDING -> NOT_SELECTED or WITHDRAWN
Engagement: AWAITING_RESPONSE -> CONFIRMED or DECLINED
Engagement: CONFIRMED -> IN_PROGRESS -> COMPLETED
```

Use:

1. Provider selects: `POST /api/provider/jobs/{jobId}/applications/{applicationId}/select`.
2. Seeker confirms/declines: `POST /api/seeker/engagements/{engagementId}/confirm|decline`.
3. Provider starts work: `POST /api/provider/engagements/{engagementId}/start`.
4. Both parties confirm completion using their respective endpoints.
5. After confirmation, the seeker may retrieve provider contact.

The seeker confirmation can fail with `409` when the selected work conflicts with availability, an exception, or another engagement. Completion is not set by one party alone; wait for both confirmation flags and `status: COMPLETED`.

### Profiles and media

Use `GET`/`PUT` profile endpoints for JSON profile data. Use `multipart/form-data` for profile pictures:

```js
const body = new FormData();
body.append("file", file);
await fetch(`${API}/api/seeker/profile/picture`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body
});
```

Do not set `Content-Type` manually for `FormData`; the browser supplies the boundary. The backend limits each file to 5 MB. `profilePictureUrl` points to a publicly readable `/uploads/profile-pictures/**` resource.

### Skills, qualifications, and work experience

Load the catalog with `GET /api/skills`, add a seeker skill with `{ "skillId": 3 }`, and remove it using the seeker-skill record ID returned by `GET /api/seeker/skills`. Qualifications and experience use list/create/update/delete endpoints with their request DTOs. Dates and required text are validated server-side.

### Availability and calendar

Create availability with:

```json
{
  "dayOfWeek": "MONDAY",
  "startDate": "2026-12-01",
  "endDate": "2026-12-31",
  "startTime": "09:00:00",
  "endTime": "17:00:00"
}
```

Use `PATCH /api/seeker/availability/{id}/status` with the fields of `AvailabilityStatusRequest` to toggle status; inspect that DTO in the source/API document because it is not a generic boolean contract. Query exceptions and calendar with required `startDate` and `endDate` parameters.

### Saved jobs, dashboards, and worker search

Saving uses idempotent-style `PUT /api/seeker/saved-jobs/{jobId}` and removal uses `DELETE`. The seeker dashboard returns recommended jobs based on implemented skills, profile, and availability logic; it is not an AI recommendation API. Provider worker search supports optional skill IDs, location, verification, rating, education/experience text, minimum years, and availability date/time filters.

### Notifications

Poll `GET /api/notifications/unread-count` for a badge and `GET /api/notifications/unread` for the list. Mark one notification with `PATCH /api/notifications/{notificationId}/read` or all with `PATCH /api/notifications/read-all`; both return `204`.

### Verification

Create a request with `{ "type": "IDENTITY" }` or `{ "type": "BUSINESS" }`, then upload each document as multipart:

```text
POST /api/verifications/{requestId}/documents
multipart fields:
  documentType=NID_FRONT
  file=<binary>
```

Supported document types are `NID_FRONT`, `NID_BACK`, and `BUSINESS_REGISTRATION`. Users can view their requests. Admin review supports pending/approved/rejected states and notes. Verification documents are private and are downloaded only through the admin endpoint.

### Reviews and job history

After an engagement is `COMPLETED`, submit:

```json
{ "rating": 5, "comment": "Reliable and helpful." }
```

to `POST /api/engagements/{engagementId}/reviews`. Ratings are 1–5 and comments are optional up to 1000 characters. Use user review and summary endpoints to render received ratings. Worker job history is available at `/api/workers/{seekerProfileId}/job-history` and contains completed engagements only.

### Reports and moderation

Users submit reports with a reason and description plus an optional reported user or job ID. Report status is initially `PENDING`. Admin screens can filter reports, mark them `UNDER_REVIEW`, and submit a moderation action. The implemented action enum is `WARNING_ISSUED`, `JOB_POST_REMOVED`, `ACCOUNT_SUSPENDED`, `ACCOUNT_REACTIVATED`, or `REPORT_DISMISSED`.

## 5. Response examples

### Auth response

```json
{
  "accessToken": "<jwt>",
  "tokenType": "Bearer",
  "userId": 12,
  "fullName": "Asha Karki",
  "email": "asha@example.com",
  "role": "JOB_SEEKER"
}
```

### Job response

```json
{
  "id": 41,
  "providerName": "Ramesh Shrestha",
  "businessName": "Ramesh Events",
  "title": "Event Helper",
  "description": "Help prepare and serve at an event.",
  "responsibilities": "Set up tables and assist guests.",
  "address": "Bhrikutimandap",
  "municipality": "Kathmandu",
  "district": "Kathmandu",
  "province": "Bagmati",
  "startDate": "2026-12-10",
  "endDate": "2026-12-10",
  "startTime": "09:00:00",
  "endTime": "17:00:00",
  "durationDescription": "1 day",
  "paymentAmount": 1500.0,
  "paymentMethod": "CASH",
  "requiredExperienceMonths": 0,
  "numberOfWorkersRequired": 2,
  "requiredSkills": ["Serving"],
  "status": "OPEN",
  "createdAt": "2026-11-13T12:00:00",
  "publishedAt": "2026-11-13T12:00:00"
}
```

### Profile response

```json
{
  "userId": 12,
  "fullName": "Asha Karki",
  "email": "asha@example.com",
  "phoneNumber": "+9779812345678",
  "dateOfBirth": "2000-05-10",
  "profilePictureUrl": "/uploads/profile-pictures/abc.png",
  "bio": "Part-time event helper",
  "address": "Kathmandu",
  "preferredTravelDistanceKm": 10,
  "verified": false
}
```

## 6. Error handling and validation

Handle errors by status, not by assuming every response is JSON. The binary document-download endpoint is not a JSON response. For JSON errors, Spring’s default body normally contains `timestamp`, `status`, `error`, `message`, and `path`, but exact fields can vary for validation/parser failures because no custom exception handler is implemented.

Recommended client behavior:

| Status | Client action |
|---|---|
| 400 | Show field/date/enum validation feedback; do not retry unchanged input. |
| 401 | Clear the token and require login. |
| 403 | Hide/disable the action or show an authorization message. |
| 404 | Show missing/unavailable resource state. |
| 409 | Refresh the resource and show the current workflow conflict (already applied, closed job, stale engagement, conflict in availability, etc.). |
| 413 | Ask the user to select a smaller file. |
| 500 | Show a generic retry/error state and log the request context client-side without credentials. |

Do not display or log JWTs, passwords, private verification files, or full authorization headers. The backend has no API version prefix beyond `/api`, no refresh-token flow, and no documented pagination except provider active jobs (`page`, size 5).

## 7. Features not currently available

The requirements mention an AI chatbot, in-app payments, push notifications, English/Nepali backend localization, provider-side review UI, and password recovery. No corresponding implemented API should be called. Build those UI areas as unavailable/coming-soon or wait for backend endpoints rather than inventing request shapes.
