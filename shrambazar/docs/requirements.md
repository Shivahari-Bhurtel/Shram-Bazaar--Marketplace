# ShramBazar - Project Breakdown

## 1. Project Overview

ShramBazar is a flexible workforce marketplace that connects job seekers, including students, workers with lower level skills and informal workers, with job providers who need workers for short-term, temporary, flexible, or task-based work.

Unlike traditional recruitment platforms, ShramBazar focuses on direct connections between workers and providers without a conventional interview and recruitment process.

The platform aims to make short-term work more accessible through skill-based matching, availability-based job recommendations, verified profiles, job histories, ratings, and reviews.

Here we focus more on jobs which requires low level skills like waiter, dishwasher, delivery boy, cleaner, driver, etc. and also jobs which can be done by students like data entry, content writing, social media management, etc.

### 1.1 Core Objectives

- Connect job seekers with suitable short-term work opportunities.
- Help providers find and select suitable workers quickly.
- Support skill-based and availability-based job matching.
- Improve trust through profile verification, job histories, ratings, and reviews.
- Support both English and Nepali.
- Provide an accessible platform for beginners and workers without formal work experience.

## 2. Application Entry and Authentication

### 2.1 Welcome Screen

When a user opens the application, they will see:

- Sign In
- Sign Up
- Language selector (English/Nepali)

### 2.2 Sign-Up Role Selection

When the user selects Sign Up, they must choose one of the following roles:

1. Register as a Job Seeker
2. Register as a Job Provider

The selected role determines the registration form and the dashboard displayed after registration.

### 2.3 Sign In

Registered users will be able to log in using their registered email and password.

After successful authentication, users will be redirected to the appropriate dashboard based on their role.

The authentication system must support:

- Email and password authentication.
- Secure password storage.
- Password recovery.
- Secure logout.
- Role-based access control.
- Protection of routes and resources based on user permissions.

## 3. Job Provider Features

### 3.1 Provider Registration

The provider registration form will contain the following fields.

#### A. Personal Information

- Full name
- Address and location
- Contact number
- Date of birth
- Age (calculated automatically from date of birth)
- Email address
- Password
- Confirm password

#### B. Business Information

- Company or business name (optional)
- Company location
- Company registration proof, if applicable

#### C. Identity Verification

Verification is optional during initial registration.

Providers can:

- Request a verified badge.
- Upload an NID document.
- Upload a company registration document, if applicable.
- View their verification status.

Users can register without completing verification immediately. However, their verification status must be clearly displayed.

A verified badge will be granted only after the submitted documents have been reviewed and approved by an authorized administrator.

### 3.2 Provider Dashboard

The provider dashboard will contain the following sections.

#### A. Post a Job

Providers can create and publish new job posts.

#### B. My Job Posts

Providers can:

- View previously created job posts.
- Edit their active job posts.
- Close or cancel job posts.
- View applicants associated with each individual post.
- View the number of workers required.
- Track selected and confirmed workers.

Each job post must maintain its own applicant list and worker selection controls.

Example:

**Post 1 - Shop Assistant**
- Worker 101 (these two are selected and confirmed)
- Worker 102

**Post 2 - Event Helper**
- Worker 112

**Post 3 - Packaging Assistant**
- Worker 201

Each person selected and confirmed are shown in the respective job post, so that the provider knows who they hired for each job.
Each application must be associated with the specific job post to which the worker applied.

#### C. Applicant Profiles

For each job post, providers can view the profiles of workers who applied.

Applicant summaries will display:

- Name
- Profile picture
- Contact information, subject to privacy and access rules
- Short profile description
- Skills and qualifications
- Work experience, if any
- Availability
- Verification status
- Completed job history
- Ratings and reviews received for completed jobs

Providers can open a worker's full profile and select the number of workers required for the job.

The platform will not require interviews or a traditional recruitment pipeline.

#### D. My Profile

Providers can:

- View their profile.
- Upload or change their profile picture.
- Edit personal information.
- Update contact details.
- View and update company information.
- Request identity verification.
- View verification status and badge.
- View ratings and reviews received from workers.

#### E. AI Chatbot

Providers can use the AI chatbot to:

- Get assistance with using the application.
- Receive guidance when creating job posts.
- Understand platform features.
- Get help completing job descriptions.

### 3.3 Create and Edit Job Posts

Every job post MUST display the essential information workers need to decide whether to apply.

#### Required Job Information

1. Job title
2. Job description
3. Job location
4. Work date and time
5. Duration
6. Payment amount
7. Payment method
8. Required skills
9. Required experience, if applicable
10. Start date
11. End date
12. Responsibilities
13. Number of workers required

#### Job Management Rules

- Providers can create and publish job posts.
- Providers can edit their own job posts.
- Providers cannot edit job posts belonging to other providers.
- A post can be closed when workers are no longer required.
- A post can be cancelled when the work is no longer available.
- Affected workers must be notified when significant job details change after they apply or are selected.
- The system must prevent applications to closed or cancelled posts.
- The system must track the status of each job post.

### 3.4 Worker Selection and Notifications

Providers can review applicants and directly select the required number of workers.

The system must:

- Track the total number of workers required.
- Track selected workers.
- Track confirmed and declined selections.
- Prevent providers from selecting more workers than required unless the required number is increased.
- Notify selected workers.
- Allow selected workers to confirm or decline the job.
- Update the selection status when a worker responds.

## 4. Job Seeker Features

### 4.1 Job Seeker Registration

The job seeker registration form will contain the following fields.

#### A. Personal Information

- Full name
- Date of birth
- Age (calculated automatically from date of birth)
- Email address
- Contact number
- Address and location
- Password
- Confirm password

#### B. Identity Verification

- Option to request a verified badge.
- NID document upload.
- Verification status.

Verification must be completed through an authorized review process before the badge is granted.

### 4.2 Job Seeker Dashboard

The job seeker dashboard will contain the following sections.

#### A. Recommended Jobs

The system will recommend jobs based on the job seeker's:

- Skills
- Qualifications and experience
- Location and preferred travel distance
- Available dates and time slots
- Preferred work categories
- Other relevant job preferences

Workers can still search for jobs manually and browse available listings.

#### B. Search and Filter Jobs

Job seekers can search and filter jobs by:

- Country and district
- Location or distance
- Job category
- Work type
- Employment type
- Required skills
- Experience or seniority level
- Minimum pay
- Work date
- Duration
- Availability compatibility

The platform will prioritize short-term, flexible, and task-based opportunities.

#### C. Job Details and Applications

Every job details page must display:

- Job title and description
- Responsibilities
- Work schedule
- Duration
- Payment amount and method
- Required skills
- Required experience
- Location
- Start and end dates
- Number of workers required
- Provider information
- Verification status, where applicable

Workers can apply directly to available job posts.

The dashboard will include the following application categories:

- All Applications
- Applied / Pending
- Accepted / Selected
- Not Selected
- Withdrawn, where applicable
- Cancelled, where applicable
- Completed, where applicable

Application statuses must be updated consistently as the job progresses.

#### D. Saved Jobs

Workers can:

- Save job posts for later viewing.
- View their saved jobs.
- Remove jobs from their saved list.

#### E. AI Chatbot

Job seekers can use the AI chatbot to:

- Find suitable jobs using natural-language requests.
- Understand job requirements.
- Get guidance on using the platform.
- Receive assistance with skills and training resources, if included.

#### F. Notifications

Workers will receive notifications when:

- They are selected for a job.
- Their application status changes.
- A confirmed job is cancelled or significantly changed.
- A confirmed work date is approaching.
- A review is available.

After selection and confirmation, workers can view the provider's contact number according to the platform's privacy rules.

## 5. Job Seeker Profile

The profile section will allow workers to manage their personal and professional information.

### 5.1 Profile Information

- Profile picture
- Name and basic information
- Contact information
- Location
- Short personal description
- Verified badge and verification status

### 5.2 Skills and Qualifications

Workers can:

- Add skills.
- Edit skills.
- Delete skills.
- Add educational qualifications.
- Add relevant certificates or training, if applicable.
- Add work experience, if any.

The platform must welcome beginners who have no previous formal work experience.

### 5.3 Availability Management

Workers can add, edit, and remove their availability information.

Availability includes:

- Available days
- Available time slots
- Available dates or date ranges
- Preferred work location
- Preferred travel distance

Availability information will be used for job recommendations and suitability checks.

### 5.4 Job History

The job history section will show work completed through ShramBazar.

Each completed job entry will display:

- Job title
- Job description summary
- Provider or business name
- Work date and duration
- Job completion status
- Rating received from the provider
- Written review received from the provider

The profile can also display an overall rating calculated from eligible reviews.

Only completed jobs should contribute to verified work history and ratings.

## 6. Reviews and Ratings

After a job is completed, both parties can rate and review each other.

### 6.1 Provider Reviews of Workers

Providers can:

- Rate workers after a completed job.
- Submit a written review.
- View reviews they have submitted.

These reviews will appear in the worker's job history and profile.

### 6.2 Worker Reviews of Providers

Workers can:

- Rate providers after a completed job.
- Submit a written review.
- View reviews they have submitted.

These reviews will appear on the provider's profile.

### 6.3 Review Rules

- Reviews must be associated with genuine completed jobs.
- Users cannot review jobs they were not involved in.
- A user should not submit multiple reviews for the same party and job unless an explicit review-editing policy permits it.
- Only eligible reviews should contribute to overall ratings.
- The system should provide a mechanism for reporting inappropriate or abusive reviews.

## 7. Job Lifecycle

The standard job lifecycle will follow these steps:

1. The provider creates and publishes a job.
2. Workers discover the job through recommendations, search, or browsing.
3. Interested workers apply for the job.
4. The provider reviews applicants.
5. The provider selects the required workers.
6. Selected workers receive notifications.
7. Selected workers confirm or decline the job.
8. The provider and confirmed workers carry out the agreed work.
9. The job is marked as completed.
10. Both parties can submit ratings and reviews.
11. The completed job and relevant reviews appear in their respective profiles.

This workflow avoids the traditional recruitment process of application, shortlisting, interviews, and formal selection rounds.

## 8. Verification, Safety, and Privacy

### 8.1 Identity Verification

- NID and company documents must be stored securely and privately.
- Only authorized personnel can review identity documents.
- Verification requests must have clear statuses, such as Pending, Approved, and Rejected.
- A verified badge must be granted only after successful verification.
- Users must be informed when their verification request is rejected.
- Verification must not imply a guarantee of safety, job legitimacy, or payment.

### 8.2 Contact Information Privacy

- Contact information must be protected from unauthorized access.
- A provider's contact number should be revealed to a selected worker only after the worker confirms the job, according to the agreed privacy policy.
- Access to personal information must follow role-based authorization rules.

### 8.3 Reporting and Moderation

- Users should be able to report suspicious jobs.
- Users should be able to report suspicious accounts and misconduct.
- Administrators should be able to review submitted reports.
- Administrators should be able to moderate inappropriate listings and accounts.
- Appropriate actions should be recorded for accountability.

### 8.4 Document and Data Protection

- The application must provide appropriate privacy notices.
- Sensitive documents must not be publicly accessible.
- Document-retention policies must define how long verification documents are kept.
- Passwords must be securely hashed.
- Authentication and authorization must protect private user data.

## 9. Language Support

ShramBazar will support:

- English
- Nepali

### 9.1 Language Selection

Users can switch languages through a language selector.

### 9.2 Translation Requirements

The selected language should apply consistently to:

- Navigation
- Buttons
- Forms
- Validation messages
- Job statuses
- Notifications
- Dashboard labels
- System messages
- Other interface text

User-generated job descriptions can remain in the language in which they were written unless a translation feature is introduced.

## 10. Proposed Future Enhancements

The following features may be added after the core marketplace is working.

- In-app chat between workers and providers.
- Voice navigation.
- AI-assisted job search.
- AI-supported skills training.
- Push notifications.
- External job API integrations.
- Advanced job recommendation algorithms.
- In-app payments, if needed.
- Job completion confirmation by both parties.
- More advanced reporting and moderation tools.

The initial version should prioritize reliable job posting, job discovery, applications, direct worker selection, verification, notifications, and work history.

## 11. Core Product Principle

ShramBazar is a flexible workforce marketplace, not a traditional recruitment portal.

Its core purpose is to help people find and complete suitable short-term work while enabling providers to find reliable workers quickly.

The platform should prioritize:

- Accessibility
- Flexibility
- Transparency
- Trust
- Privacy
- Safety
- Skill-based matching
- Availability-based matching
- Direct connections between workers and providers

## 12. Initial Development Priorities

The following checklist can be used to track development progress.

### Phase 1: Project Foundation

- [ ] Set up the frontend and backend projects.
- [ ] Configure the database.
- [ ] Define the initial database schema and entity relationships.
- [ ] Implement authentication and authorization.
- [ ] Implement job seeker and job provider roles.
- [ ] Set up English and Nepali language support.

### Phase 2: User Profiles

- [ ] Implement job seeker profiles.
- [ ] Implement provider profiles.
- [ ] Implement skills and qualifications management.
- [ ] Implement availability management.
- [ ] Implement profile picture upload.
- [ ] Implement identity verification request workflows.

### Phase 3: Job Marketplace

- [ ] Implement job creation and publishing.
- [ ] Implement job editing, closing, and cancellation.
- [ ] Implement job listings and details pages.
- [ ] Implement job search and filters.
- [ ] Implement saved jobs.
- [ ] Implement job applications.
- [ ] Implement provider applicant management.

### Phase 4: Selection and Notifications

- [ ] Implement direct worker selection.
- [ ] Implement worker confirmation and decline.
- [ ] Track required, selected, and confirmed workers.
- [ ] Implement application and selection notifications.
- [ ] Implement privacy-controlled contact information access.
- [ ] Handle job changes and cancellations.

### Phase 5: Work History and Reviews

- [ ] Implement job completion workflows.
- [ ] Implement job seeker work history.
- [ ] Implement provider job history, if required.
- [ ] Implement ratings and written reviews.
- [ ] Calculate overall ratings from eligible reviews.
- [ ] Prevent reviews for jobs that were not completed.

### Phase 6: AI and Additional Features

- [ ] Implement the AI chatbot for platform assistance.
- [ ] Explore AI-assisted job search.
- [ ] Explore AI-assisted job description generation.
- [ ] Add skills and training resources if included in the MVP.

### Phase 7: Security and Testing

- [ ] Test authentication and role-based access control.
- [ ] Test job ownership and application permissions.
- [ ] Test worker selection limits.
- [ ] Test notification workflows.
- [ ] Test verification and document access permissions.
- [ ] Test contact information privacy.
- [ ] Test English and Nepali interface consistency.
- [ ] Test the complete job lifecycle from posting to review.
- [ ] Validate input fields and handle errors appropriately.

## 13. MVP Scope

The Minimum Viable Product (MVP) should focus on the smallest complete workflow that makes ShramBazar useful.

### Essential MVP Features

1. User registration and login.
2. Job seeker and provider role selection.
3. Basic user profiles.
4. Provider job posting and management.
5. Job browsing, search, and filtering.
6. Job seeker applications.
7. Provider applicant management and worker selection.
8. Worker confirmation or decline.
9. Basic notifications.
10. Job completion and work history.
11. Ratings and reviews.
12. Basic verification request and administrative review workflows.
13. English and Nepali interface support.
14. Essential security, privacy, and authorization controls.

### Features to Consider After the MVP

- Advanced AI recommendations.
- AI-supported skills training.
- Voice navigation.
- In-app messaging.
- External job integrations.
- In-app payments.
- Advanced analytics.

The final MVP scope should be confirmed before database design and implementation begin.