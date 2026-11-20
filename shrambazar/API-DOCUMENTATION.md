# ShramBazar API Documentation

This document describes the REST API implemented by the Spring Boot application under `src/main/java/com/shrambazar/controller`. It intentionally documents only source-defined routes. Unless stated otherwise, dates use `yyyy-MM-dd`, times use `HH:mm:ss`, and timestamps are ISO-8601 local date-times.

## Base URL and common rules

The application does not configure a context path, so the local base URL is typically `http://localhost:8080`. All JSON endpoints use `Content-Type: application/json`. Authenticated requests use:

```http
Authorization: Bearer <accessToken>
```

The token is returned by registration and login in an `AuthResponse`. JWTs expire after the configured `jwt.expiration-ms` (the committed configuration sets one hour) and are rejected after logout because the token is stored in the revocation table.

Spring Security is stateless. `POST /api/auth/register/job-seeker`, `POST /api/auth/register/job-provider`, and `POST /api/auth/login` are public. `GET /api/jobs`, `GET /api/jobs/showcase`, `GET /api/jobs/{jobId}`, and profile-picture files under `/uploads/profile-pictures/**` are public. `GET` routes under `/api/jobs` are the only public job routes; all other routes require authentication. `/api/admin/**` additionally requires `ADMIN`, although the current `UserRole` enum contains `JOB_SEEKER` and `JOB_PROVIDER` only.

## Response and error conventions

Successful responses use the status shown in the endpoint catalog. Empty successful operations return `204 No Content`. There is no project-level `@ControllerAdvice`; validation and `ResponseStatusException` failures therefore use Spring Boot’s default error response shape, for example:

```json
{
  "timestamp": "2026-11-13T12:00:00.000+00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "End date cannot be before start date",
  "path": "/api/provider/jobs"
}
```

Common statuses are `400` invalid JSON, validation, enum, date, or query input; `401` missing/invalid/expired/revoked JWT or invalid credentials; `403` authenticated user lacks the required role or ownership permission; `404` resource not found or not publicly available; `409` a valid request conflicts with current state; `500` unexpected server/database failure. File endpoints can additionally return `413` when multipart limits are exceeded.

## Endpoint catalog

### Authentication

| Method | URL | Auth | Request | Success | Main errors |
|---|---|---|---|---|---|
| POST | `/api/auth/register/job-seeker` | Public | `SeekerRegisterRequest` | `201 AuthResponse` | 400, 409 |
| POST | `/api/auth/register/job-provider` | Public | `ProviderRegisterRequest` | `201 AuthResponse` | 400, 409 |
| POST | `/api/auth/login` | Public | `LoginRequest` | `200 AuthResponse` | 400, 401 |
| POST | `/api/auth/logout` | Bearer | no body | `204` | 401 if `Authorization` is absent/not Bearer |

`ForgotPasswordRequest` and `ResetPasswordRequest` exist as DTOs and are listed as permitted by security configuration, but no controller endpoint currently implements forgot/reset password.

### Public job browsing and provider jobs

| Method | URL | Auth | Request/query | Success | Main errors |
|---|---|---|---|---|---|
| POST | `/api/provider/jobs` | Provider | `JobPostRequest` | `201 JobPostResponse` | 400, 401, 403, 404 |
| GET | `/api/provider/jobs` | Provider | none | `200 JobPostResponse[]` | 401, 403 |
| PUT | `/api/provider/jobs/{jobId}` | Provider owner | path `jobId`, `JobPostRequest` | `200 JobPostResponse` | 400, 401, 403, 404, 409 |
| POST | `/api/provider/jobs/{jobId}/close` | Provider owner | path `jobId` | `204` | 401, 403, 404, 409 |
| POST | `/api/provider/jobs/{jobId}/cancel` | Provider owner | path `jobId` | `204` | 401, 403, 404, 409 |
| GET | `/api/jobs` | Public | `keyword`, `district`, `minPayment`, `maxPayment`, `workDate` optional | `200 JobPostResponse[]` | 400 for malformed numbers/date |
| GET | `/api/jobs/showcase` | Public | optional `keyword`, `location`, `category`, `jobType`, `minSalary`, `maxSalary`, `source` | `200 ShowcaseJobResponse[]` | 400 for malformed numbers |
| GET | `/api/jobs/{jobId}` | Public | path `jobId` | `200 JobPostResponse` | 404 |
| GET | `/api/provider/jobs/active?page=0` | Provider | optional non-negative `page`; page size is 5 | `200 Page<JobPostResponse>` | 400, 401, 403 |

`GET /api/jobs` filters only currently `OPEN` jobs. Keyword matching checks title, description, and responsibilities; `workDate` matches any day in the job’s start/end range.

`GET /api/jobs/showcase` returns the centralized simulated dataset loaded from `src/main/resources/data/jobs.json` at API startup. Its records are independent from provider-created `job_posts`, and this import replaces only showcase records. The response retains the dataset fields (`id`, `title`, `category`, `company`, `description`, `location`, `address`, `city`, coordinates, salary range/type, job type, experience, skills, requirements, vacancies, dates, `is_demo`, source, and location accuracy). These listings are demonstration data and are not verified vacancies.

### Applications and engagements

| Method | URL | Auth | Request | Success | Main errors |
|---|---|---|---|---|---|
| POST | `/api/jobs/{jobId}/applications` | Seeker | path `jobId`, no body | `201 ApplicationResponse` | 401, 403, 404, 409 |
| GET | `/api/seeker/applications` | Seeker | none | `200 ApplicationResponse[]` | 401, 403 |
| GET | `/api/seeker/applications/{id}` | Seeker owner | path `id` | `200 ApplicationResponse` | 401, 403, 404 |
| POST | `/api/seeker/applications/{id}/withdraw` | Seeker owner | path `id` | `204` | 401, 403, 404, 409 |
| GET | `/api/provider/jobs/{jobId}/applications` | Provider owner | path `jobId` | `200 ApplicantResponse[]` | 401, 403, 404 |
| POST | `/api/provider/jobs/{jobId}/applications/{applicationId}/reject` | Provider owner | paths only | `204` | 401, 403, 404, 409 |
| POST | `/api/provider/jobs/{jobId}/applications/{applicationId}/select` | Provider owner | paths only | `201 WorkerEngagementResponse` | 401, 403, 404, 409 |
| GET | `/api/seeker/engagements` | Seeker | none | `200 WorkerEngagementResponse[]` | 401, 403 |
| GET | `/api/provider/engagements` | Provider | none | `200 WorkerEngagementResponse[]` | 401, 403 |
| POST | `/api/seeker/engagements/{engagementId}/confirm` | Seeker participant | path only | `200 WorkerEngagementResponse` | 401, 403, 404, 409 |
| POST | `/api/seeker/engagements/{engagementId}/decline` | Seeker participant | path only | `200 WorkerEngagementResponse` | 401, 403, 404, 409 |
| POST | `/api/provider/engagements/{engagementId}/start` | Provider participant | path only | `200 WorkerEngagementResponse` | 401, 403, 404, 409 |
| POST | `/api/provider/engagements/{engagementId}/confirm-completion` | Provider participant | path only | `200 WorkerEngagementResponse` | 401, 403, 404, 409 |
| POST | `/api/seeker/engagements/{engagementId}/confirm-completion` | Seeker participant | path only | `200 WorkerEngagementResponse` | 401, 403, 404, 409 |
| GET | `/api/seeker/engagements/{engagementId}/provider-contact` | Seeker participant | path only | `200 ProviderContactResponse` | 401, 403, 404 |

Selection changes an application to `SELECTED` and creates an `AWAITING_RESPONSE` engagement. Both parties must confirm completion before the engagement becomes `COMPLETED`.

### Profiles, skills, availability, and calendar

| Method | URL | Auth | Request/query | Success | Main errors |
|---|---|---|---|---|---|
| GET | `/api/seeker/profile` | Seeker | none | `200 SeekerProfileResponse` | 401, 403 |
| PUT | `/api/seeker/profile` | Seeker | `SeekerProfileUpdateRequest` | `200 SeekerProfileResponse` | 400, 401, 403 |
| POST | `/api/seeker/profile/picture` | Seeker | multipart `file` | `200 SeekerProfileResponse` | 400, 401, 403, 413 |
| GET | `/api/provider/profile` | Provider | none | `200 ProviderProfileResponse` | 401, 403 |
| PUT | `/api/provider/profile` | Provider | `ProviderProfileUpdateRequest` | `200 ProviderProfileResponse` | 400, 401, 403 |
| POST | `/api/provider/profile/picture` | Provider | multipart `file` | `200 ProviderProfileResponse` | 400, 401, 403, 413 |
| GET | `/api/skills` | Authenticated | none | `200 SkillResponse[]` | 401 |
| GET | `/api/seeker/skills` | Seeker | none | `200 SeekerSkillResponse[]` | 401, 403 |
| POST | `/api/seeker/skills` | Seeker | `SeekerSkillRequest` | `201 SeekerSkillResponse` | 400, 401, 403, 404, 409 |
| DELETE | `/api/seeker/skills/{id}` | Seeker owner | path `id` | `204` | 401, 403, 404 |
| GET | `/api/seeker/qualifications` | Seeker | none | `200 QualificationResponse[]` | 401, 403 |
| POST | `/api/seeker/qualifications` | Seeker | `QualificationRequest` | `201 QualificationResponse` | 400, 401, 403 |
| PUT | `/api/seeker/qualifications/{id}` | Seeker owner | path, `QualificationRequest` | `200 QualificationResponse` | 400, 401, 403, 404 |
| DELETE | `/api/seeker/qualifications/{id}` | Seeker owner | path `id` | `204` | 401, 403, 404 |
| GET | `/api/seeker/experience` | Seeker | none | `200 WorkExperienceResponse[]` | 401, 403 |
| POST | `/api/seeker/experience` | Seeker | `WorkExperienceRequest` | `201 WorkExperienceResponse` | 400, 401, 403 |
| PUT | `/api/seeker/experience/{id}` | Seeker owner | path, `WorkExperienceRequest` | `200 WorkExperienceResponse` | 400, 401, 403, 404 |
| DELETE | `/api/seeker/experience/{id}` | Seeker owner | path `id` | `204` | 401, 403, 404 |
| GET | `/api/seeker/availability` | Seeker | none | `200 AvailabilityResponse[]` | 401, 403 |
| POST | `/api/seeker/availability` | Seeker | `AvailabilityRequest` | `201 AvailabilityResponse` | 400, 401, 403, 409 |
| PUT | `/api/seeker/availability/{id}` | Seeker owner | path, `AvailabilityRequest` | `200 AvailabilityResponse` | 400, 401, 403, 404, 409 |
| PATCH | `/api/seeker/availability/{id}/status` | Seeker owner | `AvailabilityStatusRequest` | `200 AvailabilityResponse` | 400, 401, 403, 404 |
| DELETE | `/api/seeker/availability/{id}` | Seeker owner | path `id` | `204` | 401, 403, 404 |
| GET | `/api/seeker/availability-exceptions?startDate=2026-12-01&endDate=2026-12-31` | Seeker | required date query parameters | `200 AvailabilityExceptionResponse[]` | 400, 401, 403 |
| POST | `/api/seeker/availability-exceptions` | Seeker | `AvailabilityExceptionRequest` | `201 AvailabilityExceptionResponse` | 400, 401, 403, 409 |
| PUT | `/api/seeker/availability-exceptions/{id}` | Seeker owner | path, `AvailabilityExceptionRequest` | `200 AvailabilityExceptionResponse` | 400, 401, 403, 404 |
| DELETE | `/api/seeker/availability-exceptions/{id}` | Seeker owner | path `id` | `204` | 401, 403, 404 |
| GET | `/api/seeker/calendar?startDate=2026-12-01&endDate=2026-12-31` | Seeker | required date query parameters | `200 CalendarEntryResponse[]` | 400, 401, 403 |
| GET | `/api/workers/{seekerProfileId}/job-history` | Authenticated | path `seekerProfileId` | `200 WorkerJobHistoryResponse[]` | 401, 403, 404 |

Profile-picture uploads accept one multipart part named `file`; configured limits are 5 MB per file and 6 MB per request. Verification files use the separate endpoint below.

### Saved jobs, dashboards, worker search, notifications, and reviews

| Method | URL | Auth | Request/query | Success | Main errors |
|---|---|---|---|---|---|
| GET | `/api/seeker/saved-jobs` | Seeker | none | `200 SavedJobResponse[]` | 401, 403 |
| PUT | `/api/seeker/saved-jobs/{jobId}` | Seeker | path `jobId` | `200 SavedJobResponse` | 401, 403, 404, 409 |
| DELETE | `/api/seeker/saved-jobs/{jobId}` | Seeker | path `jobId` | `204` | 401, 403, 404 |
| GET | `/api/seeker/dashboard` | Seeker | none | `200 RecommendedJobResponse[]` | 401, 403 |
| GET | `/api/provider/dashboard` | Provider | none | `200 ProviderDashboardResponse` | 401, 403 |
| GET | `/api/admin/dashboard` | Admin | none | `200 AdminDashboardResponse` | 401, 403 |
| GET | `/api/provider/workers/search` | Provider | optional `skillIds`, `location`, `verified`, `minRating`, `education`, `experience`, `minExperienceYears`, `availabilityDate`, `startTime`, `endTime` | `200 WorkerSearchResponse[]` | 400, 401, 403 |
| GET | `/api/notifications` | Authenticated | none | `200 NotificationResponse[]` | 401 |
| GET | `/api/notifications/unread` | Authenticated | none | `200 NotificationResponse[]` | 401 |
| GET | `/api/notifications/unread-count` | Authenticated | none | `200 UnreadCountResponse` | 401 |
| PATCH | `/api/notifications/{notificationId}/read` | Authenticated owner | path | `204` | 401, 403, 404 |
| PATCH | `/api/notifications/read-all` | Authenticated | none | `204` | 401 |
| POST | `/api/engagements/{engagementId}/reviews` | Engagement participant | path, `ReviewRequest` | `201 ReviewResponse` | 400, 401, 403, 404, 409 |
| GET | `/api/users/{userId}/reviews` | Authenticated | path | `200 ReviewResponse[]` | 401, 404 |
| GET | `/api/reviews/me` | Authenticated | none | `200 ReviewResponse[]` | 401 |
| GET | `/api/users/{userId}/reviews/summary` | Authenticated | path | `200 ReviewSummaryResponse` | 401, 404 |

The worker search query is bound from query parameters by `WorkerSearchRequest`; repeated `skillIds` parameters are supported by Spring’s list binding. The implementation’s review direction enum includes `PROVIDER_TO_WORKER` and `WORKER_TO_PROVIDER`.

### Verification

| Method | URL | Auth | Request | Success | Main errors |
|---|---|---|---|---|---|
| POST | `/api/verifications` | Authenticated | `VerificationRequestCreate` | `201 VerificationRequestResponse` | 400, 401, 409 |
| GET | `/api/verifications/me` | Authenticated | none | `200 VerificationRequestResponse[]` | 401 |
| POST | `/api/verifications/{requestId}/documents` | Request owner | multipart `documentType`, `file` | `201 VerificationDocumentResponse` | 400, 401, 403, 404, 409, 413 |
| GET | `/api/admin/verifications?status=PENDING` | Admin | optional `status` enum | `200 VerificationRequestResponse[]` | 400, 401, 403 |
| POST | `/api/admin/verifications/{requestId}/approve?note=...` | Admin | optional `note` query parameter | `200 VerificationRequestResponse` | 401, 403, 404, 409 |
| POST | `/api/admin/verifications/{requestId}/reject?note=...` | Admin | required `note` query parameter | `200 VerificationRequestResponse` | 400, 401, 403, 404, 409 |
| GET | `/api/admin/verifications/{requestId}/documents/{documentId}` | Admin | path parameters | `200` binary attachment | 401, 403, 404, 409 |

`documentType` is one of `NID_FRONT`, `NID_BACK`, or `BUSINESS_REGISTRATION`; verification type is `IDENTITY` or `BUSINESS`. Verification documents are stored under the private storage directory and are not publicly served.

### Reports, moderation, and admin skills

| Method | URL | Auth | Request/query | Success | Main errors |
|---|---|---|---|---|---|
| POST | `/api/reports` | Seeker/provider | `ReportRequest` | `201 ReportResponse` | 400, 401, 403, 404, 409 |
| GET | `/api/reports/me` | Seeker/provider | none | `200 ReportResponse[]` | 401, 403 |
| GET | `/api/admin/reports?status=PENDING` | Admin | optional `ReportStatus` | `200 AdminReportResponse[]` | 400, 401, 403 |
| GET | `/api/admin/reports/{reportId}` | Admin | path | `200 AdminReportResponse` | 401, 403, 404 |
| POST | `/api/admin/reports/{reportId}/review` | Admin | path | `200 AdminReportResponse` | 401, 403, 404, 409 |
| POST | `/api/admin/reports/{reportId}/actions` | Admin | `ModerationActionRequest` | `200 AdminReportResponse` | 400, 401, 403, 404, 409 |
| PATCH | `/api/admin/users/{userId}/suspend` | Admin | path | `200` string | 401, 403, 404, 409 |
| PATCH | `/api/admin/users/{userId}/reactivate` | Admin | path | `200` string | 401, 403, 404, 409 |
| POST | `/api/admin/skills` | Admin | `SkillRequest` | `201 SkillResponse` | 400, 401, 403, 409 |
| GET | `/api/admin/skills` | Admin | none | `200 SkillResponse[]` | 401, 403 |
| GET | `/api/admin/skills/{skillId}` | Admin | path | `200 SkillResponse` | 401, 403, 404 |
| PUT | `/api/admin/skills/{skillId}` | Admin | path, `SkillRequest` | `200 SkillResponse` | 400, 401, 403, 404, 409 |
| PATCH | `/api/admin/skills/{skillId}/deactivate` | Admin | path | `200 SkillResponse` | 401, 403, 404 |
| PATCH | `/api/admin/skills/{skillId}/activate` | Admin | path | `200 SkillResponse` | 401, 403, 404 |

## Request examples

### Register and login

```http
POST /api/auth/register/job-seeker
Content-Type: application/json
```

```json
{
  "fullName": "Asha Karki",
  "email": "asha@example.com",
  "password": "strong-password",
  "confirmPassword": "strong-password",
  "phoneNumber": "+9779812345678",
  "dateOfBirth": "2000-05-10",
  "address": "Kathmandu"
}
```

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

Provider registration adds `hasBusiness`, `businessName`, `businessLocation`, `businessDescription`, and `businessWebsite`. When `hasBusiness` is true, `businessName` and `businessLocation` are required by the service.

```json
{ "email": "asha@example.com", "password": "strong-password" }
```

### Job creation and browsing

```json
{
  "title": "Event Helper",
  "description": "Help prepare and serve at a one-day event.",
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
  "paymentAmount": 1500.00,
  "paymentMethod": "CASH",
  "requiredExperienceMonths": 0,
  "numberOfWorkersRequired": 2,
  "requiredSkillIds": [3, 7]
}
```

```json
{
  "id": 41,
  "providerName": "Ramesh Shrestha",
  "businessName": "Ramesh Events",
  "title": "Event Helper",
  "description": "Help prepare and serve at a one-day event.",
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
  "paymentAmount": 1500.00,
  "paymentMethod": "CASH",
  "requiredExperienceMonths": 0,
  "numberOfWorkersRequired": 2,
  "requiredSkills": ["Serving", "Customer service"],
  "status": "OPEN",
  "createdAt": "2026-11-13T12:00:00",
  "publishedAt": "2026-11-13T12:00:00"
}
```

### Application, engagement, and notification examples

`POST /api/jobs/41/applications` has no request body and returns:

```json
{
  "applicationId": 88,
  "jobId": 41,
  "jobTitle": "Event Helper",
  "jobAddress": "Bhrikutimandap",
  "district": "Kathmandu",
  "startDate": "2026-12-10",
  "endDate": "2026-12-10",
  "paymentAmount": 1500.00,
  "paymentMethod": "CASH",
  "status": "PENDING",
  "appliedAt": "2026-11-13T12:05:00"
}
```

```json
{
  "engagementId": 31,
  "applicationId": 88,
  "jobId": 41,
  "jobTitle": "Event Helper",
  "providerName": "Ramesh Shrestha",
  "workerName": "Asha Karki",
  "status": "CONFIRMED",
  "providerCompletionConfirmed": false,
  "seekerCompletionConfirmed": false,
  "selectedAt": "2026-11-13T12:10:00",
  "respondedAt": "2026-11-13T12:12:00",
  "startedAt": null,
  "completedAt": null
}
```

```json
{
  "id": 501,
  "type": "APPLICATION_SELECTED",
  "title": "You've been selected!",
  "message": "You have been selected for Event Helper. Please confirm or decline.",
  "referenceType": "ENGAGEMENT",
  "referenceId": 31,
  "read": false,
  "createdAt": "2026-11-13T12:10:00"
}
```

## DTO field reference

### Provider-to-applicant messages

`POST /api/applications/{applicationId}/messages` is available to an authenticated provider who owns the job. Request body:

```json
{ "message": "Please confirm your availability for the scheduled shift." }
```

The message (1–1000 characters) is persisted as a `MESSAGE` notification for the applicant, with the application ID as its reference. It is a one-way inbox message; it does not create a reply thread. The endpoint returns `204 No Content`.

The principal request and response shapes are:

| DTO | Fields |
|---|---|
| `SeekerProfileUpdateRequest` | `fullName`, `phoneNumber`, `dateOfBirth`, `address`, `bio`, `preferredTravelDistanceKm` |
| `ProviderProfileUpdateRequest` | `fullName`, `phoneNumber`, `dateOfBirth`, `address`, `businessName`, `businessLocation`, `businessDescription`, `hasBusiness`, `businessWebsite` |
| `SeekerProfileResponse` | `userId`, `fullName`, `email`, `phoneNumber`, `dateOfBirth`, `profilePictureUrl`, `bio`, `address`, `preferredTravelDistanceKm`, `verified` |
| `ProviderProfileResponse` | `userId`, `fullName`, `email`, `phoneNumber`, `dateOfBirth`, `profilePictureUrl`, `address`, `hasBusiness`, `businessName`, `businessLocation`, `businessDescription`, `businessWebsite`, `verified` |
| `AvailabilityRequest` | `dayOfWeek`, `startDate`, `endDate`, `startTime`, `endTime` |
| `AvailabilityExceptionRequest` | `exceptionDate`, `startTime`, `endTime` |
| `ReviewRequest` | `rating` (1–5), optional `comment` (maximum 1000 characters) |
| `ReportRequest` | optional positive `reportedUserId`, optional positive `reportedJobPostId`, `reason`, `description` (maximum 2000 characters) |
| `ModerationActionRequest` | `actionType`, `reason` (maximum 1000 characters) |
| `SkillRequest` | `name` (non-blank, maximum 100 characters) |
| `SeekerSkillRequest` | `skillId` |
| `QualificationRequest` | `qualificationName`, `institution`, `fieldOfStudy`, `startDate`, `endDate` |
| `WorkExperienceRequest` | `jobTitle`, `organizationName`, `description`, `startDate`, `endDate` |
| `VerificationRequestCreate` | `type` |

Important enums: `PaymentMethod = CASH | BANK_TRANSFER | DIGITAL_WALLET`; `ApplicationStatus = PENDING | SELECTED | NOT_SELECTED | WITHDRAWN`; `JobPostStatus = DRAFT | OPEN | CLOSED | CANCELLED | COMPLETED | REMOVED`; `EngagementStatus = AWAITING_RESPONSE | CONFIRMED | DECLINED | IN_PROGRESS | CANCELLED | COMPLETED`; `VerificationStatus = PENDING | APPROVED | REJECTED`; `ReportStatus = PENDING | UNDER_REVIEW | RESOLVED`; `ReportReason = SUSPICIOUS_JOB | FAKE_ACCOUNT | MISCONDUCT | HARASSMENT | PAYMENT_ISSUE`.
