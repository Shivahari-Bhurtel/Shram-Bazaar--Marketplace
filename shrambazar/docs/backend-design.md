# ShramBazar — Backend Design

## 1. Purpose

This document defines the proposed backend architecture for ShramBazar, a flexible workforce marketplace connecting job seekers with job providers who offer short-term, temporary, flexible, or task-based work.

It translates the product requirements in `docs/requirements.md` into backend workflows, domain entities, business rules, REST APIs, security requirements, and an implementation roadmap.

The backend will initially focus on a reliable core marketplace. Advanced AI features, messaging, payments, and other future enhancements will be introduced after the core workflows are operational.

## 2. Technology Stack

| Component | Technology |
|---|---|
| Programming language | Java |
| Backend framework | Spring Boot |
| Build tool | Maven |
| Database | PostgreSQL |
| Persistence | Spring Data JPA and Hibernate |
| Security | Spring Security |
| Authentication | JWT |
| API architecture | REST |
| Testing | JUnit and Spring Boot Test |
| API testing | Postman |
| AI integration | To be decided after the core backend is implemented |

## 3. Confirmed Architectural Decisions

### 3.1 Account Roles

Each account has one primary role:

- `JOB_SEEKER`
- `JOB_PROVIDER`
- `ADMIN`

A job seeker and a job provider must register using their respective registration flows. An account cannot switch roles merely by changing a request parameter.

Public registration must not allow users to assign themselves the `ADMIN` role. Administrator accounts must be created or authorized through a controlled process.

### 3.2 Authentication

The backend will use Spring Security and JWT-based authentication.

- Users register with an email address and password.
- Passwords are stored using a secure password-hashing algorithm.
- Successful login returns an authentication token.
- Protected endpoints validate authentication and authorization.
- The backend checks both the user's role and their permission to access the requested resource.

JWT logout and token invalidation requirements must be considered during implementation. With stateless JWT authentication, deleting a token on the client does not automatically invalidate a previously issued token on the server.

### 3.3 Public Job Browsing

Anyone can browse publicly available job listings and view public job details.

Authentication is required to:

- Apply for jobs.
- Save jobs.
- Manage a profile.
- Create or manage job posts.
- Access application and engagement information.

Private applicant information, contact details, and verification documents must not be exposed through public endpoints.

### 3.4 Applications and Worker Engagements

`Application` and `WorkerEngagement` are separate entities because applying for a job is different from being selected and undertaking the work.

- `Application` tracks the seeker's application.
- `WorkerEngagement` tracks selection, confirmation, work progress, cancellation, and completion.

This separation allows each applicant to have an independent outcome for a particular job.

### 3.5 Reviews

Both job seekers and job providers can review each other after a qualifying engagement has been completed.

Reviews must reference a completed engagement. Only the actual participants in that engagement can submit reviews, and each participant can submit at most one review per direction for that engagement.

## 4. User Workflows

### 4.1 Job Seeker Workflow

1. Register as a job seeker and sign in.
2. Create and manage a profile.
3. Add skills, qualifications, work experience, and availability.
4. Browse, search, filter, and save available jobs.
5. Apply for a suitable job.
6. Track the application status.
7. If selected, confirm or decline the job.
8. After confirmation, access the provider's contact number under the platform's privacy rules.
9. Complete the work according to the agreed arrangement.
10. Submit a review of the provider after completion.
11. View completed job history, ratings, and reviews.

### 4.2 Job Provider Workflow

1. Register as a job provider and sign in.
2. Create and manage a provider profile.
3. Optionally provide business details.
4. Request identity or business verification when applicable.
5. Create and publish job posts.
6. View, edit, close, or cancel their own posts.
7. Review applicants for each individual job.
8. Select up to the required number of workers.
9. Receive worker confirmation or decline responses.
10. Carry out and complete the work.
11. Review eligible workers after completion.
12. View received reviews and their own job-post history.

### 4.3 Administrator Workflow

1. Access protected administrative endpoints.
2. Review verification requests and submitted documents.
3. Approve or reject verification requests.
4. Review reports concerning suspicious jobs, accounts, or misconduct.
5. Moderate listings or accounts where appropriate.
6. Record moderation actions for accountability.

Administrators will use a dedicated role and protected administrative APIs. A separate administrator frontend is not required for the initial backend design.

## 5. Domain Model

The following entities form the proposed domain model. The exact Java classes, attributes, and relationships will be finalized before implementation.

### 5.1 Identity and Profiles

| Entity | Responsibility | Relationships |
|---|---|---|
| `User` | Shared account information, email, password hash, role, contact information, and account status | Has a seeker profile or provider profile according to the user's role |
| `SeekerProfile` | Job seeker's description, location, preferences, and profile information | Belongs to one user; has skills, qualifications, experience, and availability |
| `ProviderProfile` | Provider's profile and optional business information | Belongs to one user |
| `Skill` | Reusable skill information | Can be associated with many seekers and many job posts |
| `SeekerSkill` | Associates a seeker with a skill | Links `SeekerProfile` and `Skill` |
| `Qualification` | Education, certificates, or training information | Belongs to a seeker profile |
| `WorkExperience` | Relevant previous work experience | Belongs to a seeker profile |
| `Availability` | Worker's available dates and time slots | Belongs to a seeker profile |

One account has one primary role. Job seekers have seeker profiles, job providers have provider profiles, and administrators use their administrative role. Profiles must not be accessible or modified by unauthorized users.

### 5.2 Jobs and Applications

| Entity | Responsibility | Relationships |
|---|---|---|
| `JobPost` | Job title, description, location, schedule, duration, payment, required skills, worker count, and lifecycle status | Belongs to one provider; has many applications |
| `JobPostSkill` | Associates a job post with a required skill | Links `JobPost` and `Skill` |
| `Application` | Records a seeker's application and its application status | Links one seeker to one job post |
| `WorkerEngagement` | Tracks a selected worker's response and work lifecycle | Links a job post and seeker through the relevant application |
| `SavedJob` | Records a seeker's saved job | Links a seeker profile and job post |

Enforce a unique application per seeker per job post.

A job post can have many applications and many worker engagements, but the number of active selections must not exceed the job's required worker count.

### 5.3 Verification and Documents

| Entity | Responsibility | Relationships |
|---|---|---|
| `VerificationRequest` | Tracks identity or business verification requests, status, reviewer, and decision | Belongs to a user |
| `VerificationDocument` | Stores private metadata and a reference to a submitted document | Belongs to a verification request |

A user may submit verification requests over time. The document itself must be stored outside publicly accessible static resources.

Only authorized administrators can review verification documents and approve or reject requests.

### 5.4 Reviews, Notifications, and Moderation

| Entity | Responsibility | Relationships |
|---|---|---|
| `Review` | Stores a rating and written review | References a completed engagement, author, and review subject |
| `Notification` | Records user-specific events and notification read status | Belongs to a user |
| `Report` | Records reported jobs, accounts, or misconduct | Belongs to the reporting user and identifies the reported resource |
| `ModerationAction` | Records actions taken by administrators | References the responsible administrator and relevant report or resource |

An engagement may have one review from the provider about the worker and one review from the worker about the provider.

Only eligible reviews should contribute to overall profile ratings and verified work history.

## 6. Job and Application Lifecycles

### 6.1 Job Lifecycle

The proposed job-post statuses are:

- `OPEN`
- `CLOSED`
- `CANCELLED`
- `COMPLETED`

A provider publishes an open job, manages its availability, and closes or cancels it when appropriate.

A job's overall status is separate from each applicant's status and each selected worker's engagement status.

### 6.2 Application Lifecycle

The proposed application statuses are:

- `PENDING`
- `SELECTED`
- `NOT_SELECTED`
- `WITHDRAWN`
- `CANCELLED`

An application starts as pending. The provider can select the applicant or mark them as not selected. Withdrawal and cancellation must follow defined business rules.

### 6.3 Worker Engagement Lifecycle

The proposed engagement statuses are:

- `AWAITING_RESPONSE`
- `CONFIRMED`
- `DECLINED`
- `IN_PROGRESS`
- `CANCELLED`
- `COMPLETED`

When a provider selects a worker, the system creates the associated engagement and waits for the worker's response.

A worker can confirm or decline the selection. Declined or cancelled engagements must not be counted as confirmed work.

The exact completion process remains to be finalized. A recommended approach is to require confirmation from both parties before the engagement is marked completed.

## 7. Business Rules

### 7.1 Job Management

- Only open jobs accept new applications.
- Only the provider who owns a job can edit, close, cancel, or otherwise manage that job.
- Job posts must include the required information before publication.
- Significant changes or cancellations after applications or selections must trigger appropriate notifications.
- Closing or cancelling a job must prevent new applications.

### 7.2 Applications and Selection

- A seeker may have at most one application per job.
- A seeker can withdraw an application only when its current status permits withdrawal.
- Only the provider who owns the job can review its applicants and select workers.
- Only eligible applicants can be selected.
- The number of active selections must not exceed the required worker count.
- Worker-capacity enforcement must be transactional to prevent concurrent requests from over-selecting applicants.
- Only selected workers can confirm or decline an engagement.
- Application status must remain separate from engagement status.

### 7.3 Completion and Reviews

- Only eligible engagements can be marked completed.
- Only participants in a completed engagement can submit reviews.
- Each participant can submit at most one review in their direction for a given engagement.
- Reviews must not be accepted from unrelated users.
- Completed engagements form the basis of verified work history.

### 7.4 Verification

- Verification is optional unless a future policy specifies otherwise.
- A verification badge is granted only after an authorized approval.
- Rejected or pending requests must not display an approved verification badge.
- Verification does not guarantee the legitimacy, safety, or payment of a job.

### 7.5 Profile and Privacy Rules

- Age is calculated from date of birth rather than stored as an independently editable value.
- Users can update only their own profiles unless an authorized administrative action is involved.
- Contact information is returned only when the user and action satisfy the privacy rules.
- Provider contact information is made available to the selected seeker after the seeker confirms the engagement.
- Verification documents must never be publicly accessible.

## 8. REST API Design

These are proposed endpoints. Request and response DTOs, validation rules, error formats, and exact status codes will be established during implementation.

### 8.1 Authentication

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register/job-seeker` | Public | Register a job seeker |
| `POST` | `/api/auth/register/job-provider` | Public | Register a job provider |
| `POST` | `/api/auth/login` | Public | Authenticate and obtain a JWT |
| `POST` | `/api/auth/forgot-password` | Public | Request password recovery |
| `POST` | `/api/auth/reset-password` | Public with valid reset token | Reset a password |

Public registration must never create administrator accounts.

### 8.2 Profiles

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/seeker/profile` | Authenticated job seeker | View own seeker profile |
| `PATCH` | `/api/seeker/profile` | Authenticated job seeker | Update own seeker profile |
| `GET` | `/api/provider/profile` | Authenticated job provider | View own provider profile |
| `PATCH` | `/api/provider/profile` | Authenticated job provider | Update own provider profile |
| `GET` | `/api/seeker/profiles/{id}` | Authenticated users, with field restrictions | View permitted seeker profile information |
| `GET` | `/api/provider/profiles/{id}` | Authenticated users, with field restrictions | View permitted provider profile information |

Sensitive profile and contact fields must be returned only when the requester is authorized to access them.

### 8.3 Skills, Qualifications, Experience, and Availability

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/seeker/skills` | Job seeker | List own skills |
| `POST` | `/api/seeker/skills` | Job seeker | Add a skill |
| `PATCH` | `/api/seeker/skills/{skillId}` | Job seeker | Update an associated skill |
| `DELETE` | `/api/seeker/skills/{skillId}` | Job seeker | Remove an associated skill |
| `GET` | `/api/seeker/qualifications` | Job seeker | List own qualifications |
| `POST` | `/api/seeker/qualifications` | Job seeker | Add a qualification |
| `GET` | `/api/seeker/experience` | Job seeker | List own work experience |
| `POST` | `/api/seeker/experience` | Job seeker | Add work experience |
| `GET` | `/api/seeker/availability` | Job seeker | View own availability |
| `POST` | `/api/seeker/availability` | Job seeker | Add an availability period |
| `PATCH` | `/api/seeker/availability/{id}` | Job seeker | Update an availability period |
| `DELETE` | `/api/seeker/availability/{id}` | Job seeker | Remove an availability period |

All modifications must verify that the requested resource belongs to the authenticated seeker.

### 8.4 Job Posts

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/jobs` | Public | Browse and filter open job listings |
| `GET` | `/api/jobs/{jobId}` | Public | View public job details |
| `POST` | `/api/provider/jobs` | Job provider | Create a job post |
| `GET` | `/api/provider/jobs` | Job provider | List own job posts |
| `PATCH` | `/api/provider/jobs/{jobId}` | Owning job provider | Edit a job post |
| `POST` | `/api/provider/jobs/{jobId}/close` | Owning job provider | Close a job post |
| `POST` | `/api/provider/jobs/{jobId}/cancel` | Owning job provider | Cancel a job post |

The public job-listing endpoint can support optional filters such as location, category, required skills, work date, duration, experience, payment range, and availability compatibility.

### 8.5 Applications

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/jobs/{jobId}/applications` | Job seeker | Apply for an open job |
| `GET` | `/api/seeker/applications` | Job seeker | View own applications |
| `GET` | `/api/seeker/applications/{applicationId}` | Owning job seeker | View an application |
| `POST` | `/api/seeker/applications/{applicationId}/withdraw` | Owning job seeker, when permitted | Withdraw an application |
| `GET` | `/api/provider/jobs/{jobId}/applications` | Owning job provider | View applicants for a job |

A provider must not be able to view applicant information for a job they do not own.

### 8.6 Worker Selection and Engagements

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/provider/applications/{applicationId}/select` | Owning job provider | Select an applicant |
| `GET` | `/api/seeker/engagements` | Job seeker | View own worker engagements |
| `GET` | `/api/provider/engagements` | Job provider | View engagements for own jobs |
| `POST` | `/api/engagements/{engagementId}/confirm` | Selected job seeker | Confirm the selection |
| `POST` | `/api/engagements/{engagementId}/decline` | Selected job seeker | Decline the selection |
| `GET` | `/api/engagements/{engagementId}` | Authorized participant | View an engagement |
| `POST` | `/api/engagements/{engagementId}/completion-confirmation` | Authorized participant | Submit completion confirmation, subject to the final completion rules |
| `GET` | `/api/engagements/{engagementId}/contact-details` | Authorized participant satisfying privacy conditions | Access permitted contact details |

The selection endpoint must check the job's required worker count transactionally. Completion endpoints must be finalized after deciding whether both parties must confirm completion.

### 8.7 Saved Jobs

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/seeker/saved-jobs` | Job seeker | List saved jobs |
| `PUT` | `/api/seeker/saved-jobs/{jobId}` | Job seeker | Save a job |
| `DELETE` | `/api/seeker/saved-jobs/{jobId}` | Job seeker | Remove a saved job |

The database must enforce one saved-job record per seeker and job.

### 8.8 Verification

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/verifications` | Authenticated seeker or provider | Submit a verification request |
| `GET` | `/api/verifications/me` | Authenticated user | View own verification requests |
| `POST` | `/api/verifications/{requestId}/documents` | Owner of the request | Upload a document securely |
| `GET` | `/api/admin/verifications` | Administrator | List verification requests |
| `GET` | `/api/admin/verifications/{requestId}` | Administrator | View a request and permitted document data |
| `POST` | `/api/admin/verifications/{requestId}/approve` | Administrator | Approve verification |
| `POST` | `/api/admin/verifications/{requestId}/reject` | Administrator | Reject verification |

Document access must be protected independently of the endpoint used to retrieve the request.

### 8.9 Reviews

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/engagements/{engagementId}/reviews` | Eligible participant after completion | Submit a review |
| `GET` | `/api/users/{userId}/reviews` | Public or authenticated, subject to privacy rules | View permitted reviews |
| `GET` | `/api/reviews/me` | Authenticated user | View reviews received or authored |

The backend must derive the review author from the authenticated account rather than trusting an author ID supplied by the client.

### 8.10 Notifications

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/notifications` | Authenticated user | List own notifications |
| `PATCH` | `/api/notifications/{notificationId}/read` | Notification owner | Mark a notification as read |

The initial notification system may use in-app notifications. Real-time delivery and push notifications can be added later.

### 8.11 Reports and Moderation

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/reports` | Authenticated user | Report a job, account, or misconduct |
| `GET` | `/api/admin/reports` | Administrator | Review submitted reports |
| `GET` | `/api/admin/reports/{reportId}` | Administrator | View a report |
| `POST` | `/api/admin/reports/{reportId}/actions` | Administrator | Record a moderation action |

All moderation actions should record the administrator, action, target, timestamp, and relevant reason.

## 9. Security and Privacy Design

### 9.1 Authentication and Authorization

- Use Spring Security to secure protected endpoints.
- Use a password encoder rather than storing plain-text passwords.
- Validate JWTs and reject invalid or expired tokens.
- Enforce role-based access to seeker, provider, and administrator features.
- Enforce resource ownership and participation checks in addition to role checks.
- Do not rely on the frontend to enforce access permissions.
- Prevent users from changing another person's profile, job, application, engagement, or review.

### 9.2 Private Data and Documents

- Never store uploaded identity documents in a publicly accessible static-resource directory.
- Store documents in private object storage or a protected filesystem location.
- Restrict document access to the document owner and authorized reviewers.
- Validate file types and sizes.
- Avoid exposing internal storage paths and unnecessary sensitive metadata.
- Return only the contact information needed for the authorized interaction.
- Enforce provider-contact access rules on the backend.

### 9.3 Validation and Error Handling

- Validate request DTOs using Jakarta Bean Validation where applicable.
- Check all referenced entities and their ownership before updating data.
- Reject invalid state transitions.
- Return consistent API errors without exposing stack traces or sensitive implementation details.
- Add tests for authorization failures, invalid input, duplicate applications, worker-capacity enforcement, and unauthorized review attempts.

### 9.4 Auditability and Retention

- Record verification decisions and moderation actions.
- Define privacy notices and document-retention policies before production.
- Ensure account and document access follows applicable privacy requirements.

## 10. Implementation Roadmap

Implementation should proceed in dependency order. Each stage must be tested before moving to the next.

### Stage 1: Project Foundation

- Confirm the Java and Spring Boot versions.
- Verify Maven dependencies and project structure.
- Configure PostgreSQL.
- Configure application properties and environment variables.
- Verify that the application starts successfully.
- Add a basic test profile.

### Stage 2: Identity and Authentication

- Design the user and role model.
- Implement registration and password hashing.
- Implement login and JWT authentication.
- Configure Spring Security.
- Add role-based and ownership-based authorization.
- Test public and protected endpoints.

### Stage 3: Profiles and Skills

- Implement seeker and provider profiles.
- Implement skills, qualifications, work experience, and availability.
- Add profile validation and ownership checks.
- Test profile management.

### Stage 4: Job Publishing and Discovery

- Implement job posts and required skills.
- Implement provider-owned job CRUD operations.
- Implement job lifecycle status and input validation.
- Implement public job listing, details, and filters.
- Test ownership and restrictions on closed or cancelled jobs.

### Stage 5: Applications and Worker Selection

- Implement applications and the unique seeker-job constraint.
- Implement provider applicant lists.
- Implement worker selection.
- Implement transaction-safe worker-capacity enforcement.
- Implement worker confirmation and decline.
- Test application and engagement status transitions.

### Stage 6: Completion, History, and Reviews

- Finalize the job-completion workflow.
- Implement completed job history.
- Implement two-way reviews.
- Prevent duplicate or ineligible reviews.
- Test completion and review rules.

### Stage 7: Saved Jobs and Notifications

- Implement saved jobs.
- Implement in-app notifications.
- Generate notifications for application decisions, selection, confirmation-related changes, and job cancellations.
- Add tests for notification ownership.

### Stage 8: Verification and Administration

- Implement private document upload and storage.
- Implement verification requests and administrative decisions.
- Implement reporting and moderation actions.
- Test administrative permissions and document access.
- Define applicable retention policies.

### Stage 9: Hardening and Integration Testing

- Test complete user workflows.
- Review API validation and exception handling.
- Test unauthorized access and ownership violations.
- Test concurrent worker selections.
- Review sensitive-data exposure.
- Document API behavior and environment setup.

### Stage 10: Future Enhancements

After the core marketplace is reliable, consider:

- AI-assisted job description generation.
- AI-supported job search and recommendations.
- An AI application-help chatbot.
- In-app messaging.
- Push notifications.
- Voice navigation.
- In-app payments.
- External job API integrations.
- Skills training resources.

These enhancements are outside the initial implementation scope.

## 11. Open Questions Before Implementation

The following decisions need to be finalized as the corresponding features are designed.

1. **Account registration:** Confirm the required fields for each role and whether users can change roles or create a second account.
2. **Job completion:** Decide whether both parties must confirm completion or whether another completion workflow is needed.
3. **Withdrawal and cancellation:** Define when seekers may withdraw and when providers may cancel after selection or confirmation.
4. **Contact privacy:** Define which party's contact details can be viewed at each stage and under what conditions.
5. **Verification policy:** Define the accepted document types, review requirements, and document-retention policy.
6. **Notifications:** Decide which events are required for the first release and whether in-app notifications are sufficient.
7. **AI integration:** Decide whether the AI features will use a separate Python service and which feature should be implemented first.

These decisions should be resolved before implementing their respective features rather than introducing unnecessary complexity at the beginning.

## 12. Core Design Principles

The ShramBazar backend should follow these principles:

- Keep the initial architecture simple and suitable for a single Spring Boot application.
- Enforce security and business rules on the backend.
- Separate responsibilities between controllers, services, repositories, and domain entities.
- Keep job status, application status, and worker-engagement status distinct.
- Validate ownership and authorization for every protected resource.
- Build and test features incrementally.
- Design for future extensions without implementing every potential enhancement in the MVP.
- Ensure the platform supports accessible, trustworthy, flexible, and direct connections between job seekers and job providers.