# ShramBazar Backend Technical Documentation

## Scope and implementation status

ShramBazar is a Spring Boot 4.1.2 / Java 21 REST backend using Spring MVC, Spring Data JPA, Spring Security, PostgreSQL, Jakarta Validation, and JJWT 0.13.0. The source currently implements registration/login, job publishing and browsing, applications, worker selection, availability, profiles, verification, notifications, reports/moderation, dashboards, saved jobs, reviews, and worker history.

The requirements document describes planned chatbot, payments, English/Nepali UI, forgot/reset password, and richer recommendation features. Those are not implemented as backend endpoints. Password recovery DTOs exist, but no controller/service flow exposes them. There is also no custom exception handler, refresh-token endpoint, or database migration directory.

## Architecture

The application entry point is `com.shrambazar.ShrambazarApplication`. The runtime flow is:

```text
HTTP request
  -> Spring MVC controller
  -> service (current-user lookup, authorization, business rules, transactions)
  -> Spring Data JPA repository
  -> PostgreSQL
```

Controllers return DTOs rather than entities. Services map entities to records/classes, enforce ownership and state transitions, and create notifications. Repositories are interfaces extending `JpaRepository`, with derived queries and a few JPQL/locking queries.

### Package structure

| Package | Responsibility |
|---|---|
| `config` | Web resource mapping and Spring Security configuration |
| `controller` | REST endpoints grouped by feature |
| `dto` | Request/response records and dashboard response classes |
| `entity` | JPA persistent model |
| `enums` | Persisted and API status/type enums |
| `repository` | Spring Data JPA repositories |
| `security` | User lookup, JWT generation/validation, request filter |
| `service` | Business logic grouped by feature |

Feature service groups include `auth`, `job`, `application`, `engagement`, `profile`, `skill`, `availability`, `applicationexception`, `calendar`, `dashboard`, `notification`, `review`, `report`, and `verification`.

## Security and authentication

`SecurityConfig` disables CSRF, form login, and HTTP Basic, and sets `SessionCreationPolicy.STATELESS`. `BCryptPasswordEncoder` hashes passwords. `CustomUserDetailsService` loads users by case-insensitive email and exposes the user role as a Spring authority. Method security is enabled with `@EnableMethodSecurity`.

`JwtService` decodes the base64 `jwt.secret`, signs tokens with an HMAC key, and puts the normalized email in the JWT subject. Tokens contain issued-at and expiration claims. `JwtAuthenticationFilter` reads `Authorization: Bearer ...`, loads the user, validates signature/subject/expiration, checks `RevokedToken`, and populates the security context.

Roles currently represented by `UserRole` are:

* `JOB_SEEKER`: seeker profile, applications, availability, saved jobs, seeker engagement actions, and seeker dashboard.
* `JOB_PROVIDER`: provider profile, jobs, applicant management, worker search, provider engagement actions, and provider dashboard.
* `ADMIN` is referenced by URL rules and `@PreAuthorize`, but it is not present in the committed `UserRole` enum. Administrative routes therefore require an authority that the current enum/model cannot create through the public registration flow; this is an implementation gap to resolve before deploying admin features.

Logout is token revocation, not server-side session destruction. The revocation record stores a token hash and expiration. There is no refresh-token endpoint. Account status is stored on `User`; moderation changes it, and user loading rejects non-active users.

## Controller and service inventory

| Feature | Controllers | Services |
|---|---|---|
| Auth | `AuthController` | `AuthService`, `TokenRevocationService` |
| Jobs | `JobPostController`, `SavedJobController` | `JobPostService`, `SavedJobService` |
| Applications | `ApplicationController` | `ApplicationService` |
| Engagement | `WorkerEngagementController` | `WorkerEngagementService` |
| Profiles | `ProfileController`, `QualificationController`, `WorkExperienceController`, `WorkerJobHistoryController` | `ProfileService`, `ProfilePictureService`, `QualificationService`, `WorkExperienceService`, `JobHistoryService` |
| Skills | `SkillController`, `AdminSkillController` | `SkillService`, `SkillManagementService` |
| Availability | `AvailabilityController`, `AvailabilityExceptionController`, `CalendarController` | `AvailabilityService`, `AvailabilityExceptionService`, `SeekerCalendarService` |
| Dashboards | `SeekerDashboardController`, `ProviderDashboardController`, `AdminDashboardController`, `WorkerSearchController` | corresponding dashboard services and `WorkerSearchService` |
| Notifications | `NotificationController` | `NotificationService`, scheduled `UpcomingWorkReminderService` |
| Reviews | `ReviewController` | `ReviewService` |
| Verification | `VerificationController`, `AdminVerificationController` | `VerificationService`, `VerificationFileStorageService` |
| Reports | `ReportController`, `AdminReportController`, `AdminUserModerationController` | `ReportService`, `ModerationService` |

## Domain model and relationships

The database uses PostgreSQL with `spring.jpa.hibernate.ddl-auto=update`; Hibernate updates the schema from entities at startup. IDs use identity generation. Enum fields use `EnumType.STRING`.

| Entity/table | Important fields and relationships |
|---|---|
| `User` / `users` | `id`, name, unique email, password hash, phone, DOB, `UserRole`, `AccountStatus`, audit timestamps. One-to-one with either `SeekerProfile` or `ProviderProfile`; parent of notifications, verification requests, reports, reviews, password-reset tokens, revoked moderation actions. |
| `SeekerProfile` / `seeker_profiles` | Unique one-to-one `user_id`; picture, bio, address, preferred travel distance. One-to-many skills, qualifications, work experiences, availability, exceptions, saved jobs, applications through profile. |
| `ProviderProfile` / `provider_profiles` | Unique one-to-one `user_id`; picture, address, business fields, `hasBusiness`. One-to-many job posts. |
| `Skill` / `skills` | Unique skill name constraint, active flag. Joined to jobs by `JobPostSkill` and seekers by `SeekerSkill`. |
| `SeekerSkill` / `seeker_skills` | Many-to-one seeker profile and skill; unique seeker/skill pair. |
| `JobPost` / `job_posts` | Provider, title/description/responsibilities, location, date/time range, payment and method, experience months, worker count, `JobPostStatus`, audit/published timestamps. |
| `JobPostSkill` / `job_post_skills` | Many-to-one job and skill, required flag; unique job/skill pair. |
| `Application` / `applications` | Many-to-one job and seeker profile, `ApplicationStatus`, applied/updated timestamps. Unique job/seeker pair. |
| `WorkerEngagement` / `worker_engagements` | One-to-one application (unique application ID), engagement status, selection/response/start/completion timestamps, two completion-confirmation booleans, reminder flag. |
| `SavedJob` / `saved_jobs` | Many-to-one seeker profile and job post, saved timestamp; unique seeker/job pair. |
| `Availability` / `availabilities` | Seeker, day/date range, start/end time, active flag, audit timestamps. |
| `AvailabilityException` / `availability_exceptions` | Seeker, exception date and unavailable time range. |
| `Qualification` / `qualifications` | Seeker, qualification name, institution, field, dates, current-study flag. |
| `WorkExperience` / `work_experiences` | Seeker, title, organization, description, dates, current-work flag. |
| `Notification` / `notifications` | User, notification type/title/message, reference type/id, read/readAt, createdAt. |
| `Review` / `reviews` | Engagement, reviewer, reviewee, direction, rating, comment, createdAt. Unique review constraint prevents duplicate reviewer/reviewee/engagement combinations. |
| `VerificationRequest` / `verification_requests` | User, type, status, optional reviewing admin, note, submitted/reviewed/updated timestamps. |
| `VerificationDocument` / `verification_documents` | Verification request, document type, original filename, private storage key, content type, size, upload timestamp. |
| `Report` / `reports` | Reporter, optional reported user/job, reason, description, status, created/resolved timestamps. |
| `ModerationAction` / `moderation_actions` | Report, admin, action type, reason, createdAt. |
| `PasswordResetToken` / `password_reset_tokens` | User, token hash, expiration, usedAt, createdAt. Entity exists but no exposed flow currently uses it. |
| `RevokedToken` / `revoked_tokens` | Token hash, expiration, revokedAt; used for logout invalidation. |

Relationships are deliberately lazy for most associations. Controllers expose selected DTO fields, not database entities or password/token hashes.

## DTOs and validation

Requests use Java records and Jakarta Bean Validation. Important constraints include:

* Registration/profile names are non-blank and generally limited to 100 characters; emails are syntactically valid and at most 254 characters.
* Passwords are 8–72 characters and registration additionally requires matching confirmation.
* Phone numbers match `^\\+?[0-9]{7,15}$`.
* DOB is in the past; availability/job dates are present/future-or-present where annotated.
* Job payment is at least `0.01`, worker count is at least `1`, and required skill IDs are positive.
* Review ratings are 1–5; report/moderation text has maximum lengths.

`JobPostService` adds cross-field checks: end date cannot precede start date, same-day end time must be after start time, required skill IDs must be distinct and existing. `ProviderRegisterRequest` and provider profile updates require business name/location when `hasBusiness` is true.

There is no custom validation error DTO. Clients should not depend on a single stable error schema beyond the HTTP status and message supplied by Spring.

## Business workflows

### Registration and account

Registration normalizes email to lowercase, checks uniqueness, hashes the password, creates a role-specific profile, and returns a JWT immediately. Login authenticates email/password and returns the same response shape. Logout hashes/revokes the presented token.

### Job and application lifecycle

Provider-created jobs are immediately `OPEN` (the `DRAFT` enum exists and can be edited/cancelled, but the create endpoint does not create drafts). Providers can edit `OPEN`/`DRAFT` jobs, close only `OPEN` jobs, and cancel `OPEN`/`DRAFT` jobs. Public browsing only returns `OPEN` jobs.

Seekers can apply only while the job is open and its end date has not passed. Duplicate applications are rejected. Applications start `PENDING`; providers can reject pending applications (`NOT_SELECTED`) or select them (`SELECTED`), which creates an `AWAITING_RESPONSE` engagement. Selection is locked and counted against `numberOfWorkersRequired`.

The engagement lifecycle is:

```text
AWAITING_RESPONSE -> CONFIRMED -> IN_PROGRESS -> COMPLETED
AWAITING_RESPONSE -> DECLINED
```

The seeker confirms or declines. Confirmation validates calendar/availability conflicts. The provider starts confirmed work. Provider and seeker each confirm completion; only the second confirmation sets `COMPLETED` and `completedAt`. Reviews and worker history require completed engagements. Provider contact is visible to the seeker only from `CONFIRMED`, `IN_PROGRESS`, or `COMPLETED`.

### Availability and calendar

Seekers manage recurring/date-ranged availability and explicit unavailable exceptions. The calendar service derives entries from confirmed/in-progress engagements and validates overlapping work, availability windows, exceptions, and conflicting engagements before confirmation.

### Verification

Any authenticated user can create a pending verification request and upload documents while it is pending. Admins can list/filter requests, approve or reject with notes, and download documents. Verification status is surfaced in profile/search responses as an approved flag. Files are stored outside public profile-picture serving.

### Notifications

Application, selection, confirmation, withdrawal, job update/cancellation, verification, and upcoming-work events create notifications. A scheduled reminder service sends upcoming-work notifications for confirmed engagements. Users can read one or all notifications.

### Reviews and history

Reviews require a completed engagement and are direction-dependent between the worker and provider. Ratings are constrained to 1–5 and summaries calculate the average. Worker job history includes completed engagements and provider-to-worker rating/review data.

### Reports and moderation

Seekers/providers submit reports with an optional reported user/job target. Admins move pending reports to `UNDER_REVIEW`, take a typed action, and record a moderation action. Supported action types are `WARNING_ISSUED`, `JOB_POST_REMOVED`, `ACCOUNT_SUSPENDED`, `ACCOUNT_REACTIVATED`, and `REPORT_DISMISSED`. Direct suspend/reactivate endpoints update account status.

## Configuration and storage

Relevant configuration in `application.properties`:

* PostgreSQL URL, username, and password are environment-backed; the password value is intentionally not documented here.
* `spring.jpa.hibernate.ddl-auto=update`, SQL logging and formatted SQL are enabled.
* `jwt.secret` is required from `JWT_SECRET`; `jwt.expiration-ms` is `3600000`.
* Multipart max file size is 5 MB and max request size is 6 MB.
* Verification storage defaults to `./private-storage/verification` and profile pictures to `./uploads/profile-pictures`.
* `ProfilePictureWebConfig` maps `/uploads/profile-pictures/**` to the profile-picture directory, making those files publicly readable.

## Repositories

All repositories extend Spring Data JPA repositories. Representative custom behavior includes ownership queries (`findByIdAndProviderProfileId`, seeker-scoped lookups), status/date ordering, unique-existence checks, dashboard counts, and pessimistic-write locks for job selection and seeker confirmation. This prevents concurrent providers from selecting beyond the required worker count and prevents concurrent availability confirmations for the same seeker.

## Testing and operational notes

The repository contains a single Spring context smoke test, `ShrambazarApplicationTests`. It does not constitute endpoint/workflow coverage. Before production use, add integration coverage for role enforcement, admin-role availability, job ownership, selection limits, availability conflicts, file validation, report actions, and all state transitions.
