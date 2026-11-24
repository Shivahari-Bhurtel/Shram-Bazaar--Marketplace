
package com.shrambazar.service.engagement;

import com.shrambazar.dto.engagement.WorkerEngagementResponse;
import com.shrambazar.dto.engagement.WorkerRequestOffer;
import com.shrambazar.entity.*;
import com.shrambazar.enums.*;
import com.shrambazar.repository.*;
import com.shrambazar.service.CurrentUserService;

import com.shrambazar.service.calendar.SeekerCalendarService;
import com.shrambazar.service.notification.NotificationService;
import com.shrambazar.service.notification.ConversationService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;

import com.shrambazar.dto.engagement.ProviderContactResponse;

@Service
public class WorkerEngagementService {

    private final WorkerEngagementRepository engagementRepository;
    private final ApplicationRepository applicationRepository;
    private final JobPostRepository jobPostRepository;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;
    private final SeekerCalendarService seekerCalendarService;
    private final SeekerProfileRepository seekerProfileRepository;
    private final ConversationService conversationService;
    private final EngagementPaymentRepository paymentRepository;

    public WorkerEngagementService(
            WorkerEngagementRepository engagementRepository,
            ApplicationRepository applicationRepository,
            JobPostRepository jobPostRepository,
            CurrentUserService currentUserService,
            NotificationService notificationService,
            SeekerCalendarService seekerCalendarService,
            SeekerProfileRepository seekerProfileRepository,
            ConversationService conversationService,
            EngagementPaymentRepository paymentRepository){

        this.engagementRepository = engagementRepository;
        this.applicationRepository = applicationRepository;
        this.jobPostRepository = jobPostRepository;
        this.currentUserService = currentUserService;
        this.notificationService = notificationService;
        this.seekerCalendarService = seekerCalendarService;
        this.seekerProfileRepository = seekerProfileRepository;
        this.conversationService = conversationService;
        this.paymentRepository = paymentRepository;
    }

    // Provider selects an applicant
    @Transactional
    public WorkerEngagementResponse selectApplicant(
            Long jobId,
            Long applicationId) {

        ProviderProfile provider =
                currentUserService.getCurrentProviderProfile();

        // Lock the job row to prevent concurrent over-selection.
        JobPost job = jobPostRepository
                .findByIdAndProviderProfileIdForUpdate(
                        jobId, provider.getId()
                )
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Job not found"
                        )
                );

        if (job.getStatus() != JobPostStatus.OPEN) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This job is not open"
            );
        }

        Application application =
                applicationRepository.findByIdAndJobPostId(
                        applicationId, jobId
                ).orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Application not found"
                        )
                );

        if (application.getStatus() != ApplicationStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This application is no longer pending"
            );
        }

        if (engagementRepository.existsByApplicationId(applicationId)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "An engagement already exists for this application"
            );
        }

        long selectedCount = engagementRepository.countByJobAndStatuses(
                jobId,
                EnumSet.of(
                        EngagementStatus.AWAITING_RESPONSE,
                        EngagementStatus.CONFIRMED,
                        EngagementStatus.IN_PROGRESS,
                        EngagementStatus.COMPLETED
                )
        );

        if (selectedCount >= job.getNumberOfWorkersRequired()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Required number of workers has already been selected"
            );
        }

        application.setStatus(ApplicationStatus.SELECTED);
        applicationRepository.save(application);

        WorkerEngagement engagement = new WorkerEngagement();
        engagement.setApplication(application);
        engagement.setStatus(EngagementStatus.AWAITING_RESPONSE);
        engagement.setSelectedAt(LocalDateTime.now());

        WorkerEngagement saved =
                engagementRepository.save(engagement);

        // Offers and later messages share one persistent, job-linked thread.
        conversationService.open(application.getId());
        java.math.BigDecimal amount = application.getOfferedAmount() == null ? job.getPaymentAmount() : application.getOfferedAmount();
        String paymentUnit = job.getPaymentPeriod() == null ? "" : "/" + job.getPaymentPeriod().name().toLowerCase().replace("per_", "");
        conversationService.addSystemEventForApplication(application.getId(), "Hiring offer sent for " + job.getTitle() + (amount == null ? "" : " — NPR " + amount.stripTrailingZeros().toPlainString() + paymentUnit));

        notificationService.createNotification(
                application.getSeekerProfile().getUser(),
                NotificationType.APPLICATION_SELECTED,
                "You've been selected!",
                "You have been selected for "
                        + job.getTitle()
                        + ". Please confirm or decline.",
                "ENGAGEMENT",
                saved.getId()
        );

        return mapToResponse(saved);

    }

    // Provider directly requests a worker using the same application and engagement lifecycle.
    @Transactional
    public WorkerEngagementResponse requestWorker(Long jobId, Long seekerUserId, WorkerRequestOffer offer) {
        ProviderProfile provider = currentUserService.getCurrentProviderProfile();
        JobPost job = jobPostRepository.findByIdAndProviderProfileIdForUpdate(jobId, provider.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
        if (job.getStatus() != JobPostStatus.OPEN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This job is not open");
        }
        SeekerProfile seeker = seekerProfileRepository.findByUserId(seekerUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Worker profile not found"));
        if (!seeker.isAcceptingWork()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This worker is not accepting new work");
        }
        Application application = applicationRepository.findByJobPostIdAndSeekerProfileId(jobId, seeker.getId())
                .orElseGet(() -> {
                    Application created = new Application();
                    created.setJobPost(job);
                    created.setSeekerProfile(seeker);
                    created.setStatus(ApplicationStatus.PENDING);
                    User worker = seeker.getUser();
                    created.setApplicantName(worker.getFullName());
                    created.setApplicantEmail(worker.getEmail());
                    created.setApplicantPhone(worker.getPhoneNumber());
                    created.setApplicantLocation(seeker.getAddress() == null ? "" : seeker.getAddress());
                    created.setExperienceLevel("No Experience");
                    created.setIntroduction(seeker.getBio() == null ? "" : seeker.getBio());
                    return applicationRepository.save(created);
                });
        if (application.getStatus() != ApplicationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This worker already has an offer for the task");
        }
        if (engagementRepository.existsByApplicationId(application.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A request is already pending for this worker");
        }
        java.math.BigDecimal agreedAmount = offer == null ? null : offer.agreedAmount();
        if (agreedAmount == null) agreedAmount = job.getPaymentAmount();
        if (agreedAmount == null || agreedAmount.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter an agreed payment amount before sending this offer");
        }
        if (job.getPaymentMaxAmount() != null && job.getPaymentAmount() != null && (agreedAmount.compareTo(job.getPaymentAmount()) < 0 || agreedAmount.compareTo(job.getPaymentMaxAmount()) > 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The agreed amount must be within the task's posted payment range");
        }
        application.setOfferedAmount(agreedAmount);
        application.setOfferMessage(null);
        application.setEstimatedDurationHours(null);
        application.setProposedStartAt(null);
        applicationRepository.save(application);
        WorkerEngagementResponse response = selectApplicant(jobId, application.getId());
        if (offer != null && offer.message() != null && !offer.message().isBlank()) {
            var conversation = conversationService.open(application.getId());
            conversationService.send(conversation.id(), offer.message());
        }
        return response;
    }

    // Seeker views their engagements
    @Transactional(readOnly = true)
    public List<WorkerEngagementResponse> getMyEngagements() {

        SeekerProfile seeker =
                currentUserService.getCurrentSeekerProfile();

        return engagementRepository
                .findByApplicationSeekerProfileId(seeker.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // Provider views engagements for their jobs
    @Transactional(readOnly = true)
    public List<WorkerEngagementResponse> getProviderEngagements() {

        ProviderProfile provider =
                currentUserService.getCurrentProviderProfile();

        return engagementRepository
                .findByApplicationJobPostProviderProfileId(provider.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // Selected seeker confirms the job
    @Transactional
    public WorkerEngagementResponse confirmEngagement(Long engagementId) {

        SeekerProfile currentSeeker =
                currentUserService.getCurrentSeekerProfile();

        // 1. Lock the seeker's profile row
        SeekerProfile seeker = seekerProfileRepository
                .findByIdForUpdate(currentSeeker.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Seeker profile not found"
                ));

        // 2. Find the engagement
        WorkerEngagement engagement =
                findSeekerEngagement(engagementId, seeker.getId());

        // 3. Check whether the engagement is awaiting a response
        validatePendingResponse(engagement);

        // 4. Get the associated job
        JobPost job = engagement.getApplication().getJobPost();
        job = jobPostRepository.findByIdForUpdate(job.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));

        // 5. Reject confirmation if the job was cancelled
        if (job.getStatus() == JobPostStatus.CANCELLED || job.getStatus() == JobPostStatus.CLOSED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This job is no longer available for confirmation"
            );
        }

        // 6. Validate availability while holding the lock
        seekerCalendarService.validateJobAvailability(seeker, job);

        // 7. Confirm the engagement
        engagement.setStatus(EngagementStatus.CONFIRMED);
        engagement.setRespondedAt(LocalDateTime.now());
        engagementRepository.save(engagement);
        createUnpaidPaymentIfNeeded(engagement);
        conversationService.addSystemEventForApplication(engagement.getApplication().getId(), "Hiring offer accepted. Work scheduled for " + job.getStartDate() + ".");

        long confirmedWorkers = engagementRepository.countByJobAndStatuses(
                job.getId(),
                EnumSet.of(EngagementStatus.CONFIRMED, EngagementStatus.IN_PROGRESS, EngagementStatus.COMPLETED)
        );
        if (confirmedWorkers >= job.getNumberOfWorkersRequired() && job.getStatus() == JobPostStatus.OPEN) {
            job.setStatus(JobPostStatus.ASSIGNED);
            jobPostRepository.save(job);
        }

        // 8. Notify the provider
        notificationService.createNotification(
                job.getProviderProfile().getUser(),
                NotificationType.WORKER_CONFIRMED,
                "Worker confirmed the job",
                seeker.getUser().getFullName()
                        + " confirmed "
                        + job.getTitle(),
                "ENGAGEMENT",
                engagement.getId()
        );

        return mapToResponse(engagement);
    }

    // Selected seeker declines the job
    @Transactional
    public WorkerEngagementResponse declineEngagement(Long engagementId) {

        SeekerProfile seeker =
                currentUserService.getCurrentSeekerProfile();

        WorkerEngagement engagement =
                findSeekerEngagement(engagementId, seeker.getId());

        validatePendingResponse(engagement);

        engagement.setStatus(EngagementStatus.DECLINED);
        engagement.setRespondedAt(LocalDateTime.now());
        conversationService.addSystemEventForApplication(engagement.getApplication().getId(), "Hiring offer declined.");

        notificationService.createNotification(
                engagement.getApplication()
                        .getJobPost()
                        .getProviderProfile()
                        .getUser(),
                NotificationType.WORKER_DECLINED,
                "Worker declined the job",
                engagement.getApplication()
                        .getSeekerProfile()
                        .getUser().getFullName()
                        + " declined "
                        + engagement.getApplication()
                        .getJobPost().getTitle(),
                "ENGAGEMENT",
                engagement.getId()
        );

        return mapToResponse(engagement);
    }

    @Transactional
    public WorkerEngagementResponse withdrawPendingOffer(Long engagementId) {
        ProviderProfile provider = currentUserService.getCurrentProviderProfile();
        WorkerEngagement engagement = engagementRepository.findForProviderForUpdate(engagementId, provider.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Hiring offer not found"));
        if (engagement.getStatus() != EngagementStatus.AWAITING_RESPONSE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only a pending offer can be withdrawn");
        }
        engagement.setStatus(EngagementStatus.CANCELLED);
        engagement.setCancelledAt(LocalDateTime.now());
        conversationService.addSystemEventForApplication(engagement.getApplication().getId(), "Hiring offer withdrawn by the provider.");
        notificationService.createNotification(
                engagement.getApplication().getSeekerProfile().getUser(),
                NotificationType.OFFER_WITHDRAWN,
                "Hiring offer withdrawn",
                "The provider withdrew the offer for “" + engagement.getApplication().getJobPost().getTitle() + "”.",
                "ENGAGEMENT",
                engagement.getId()
        );
        return mapToResponse(engagement);
    }

    private WorkerEngagement findSeekerEngagement(
            Long engagementId,
            Long seekerProfileId) {

        return engagementRepository.findForSeeker(
                engagementId, seekerProfileId
        ).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Engagement not found"
                )
        );
    }

    private void validatePendingResponse(WorkerEngagement engagement) {

        if (engagement.getStatus() != EngagementStatus.AWAITING_RESPONSE) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This engagement is no longer awaiting a response"
            );
        }
    }

    private void createUnpaidPaymentIfNeeded(WorkerEngagement engagement) {
        if (paymentRepository.findByEngagementId(engagement.getId()).isPresent()) return;
        Application application = engagement.getApplication();
        java.math.BigDecimal amount = application.getOfferedAmount();
        if (amount == null) amount = application.getJobPost().getPaymentAmount();
        if (amount == null || amount.signum() <= 0) return;
        EngagementPayment payment = new EngagementPayment();
        payment.setEngagement(engagement);
        payment.setAmount(amount);
        payment.setMethod(application.getJobPost().getPaymentMethod() == null ? "PENDING" : application.getJobPost().getPaymentMethod().name());
        payment.setPaymentDate(application.getJobPost().getStartDate());
        payment.setStatus("UNPAID");
        paymentRepository.save(payment);
    }

    private WorkerEngagementResponse mapToResponse(
            WorkerEngagement engagement) {

        Application application = engagement.getApplication();
        JobPost job = application.getJobPost();

        return new WorkerEngagementResponse(
                engagement.getId(),
                application.getId(),
                job.getId(),
                job.getTitle(),
                job.getProviderProfile().getUser().getFullName(),
                application.getSeekerProfile().getUser().getFullName(),
                engagement.getStatus(),
                engagement.isProviderCompletionConfirmed(),
                engagement.isSeekerCompletionConfirmed(),
                engagement.getSelectedAt(),
                engagement.getRespondedAt(),
                engagement.getStartedAt(),
                engagement.getCompletedAt()
        );
    }


    // Provider marks confirmed work as started
    @Transactional
    public WorkerEngagementResponse startWork(Long engagementId) {

        ProviderProfile provider =
                currentUserService.getCurrentProviderProfile();

        WorkerEngagement engagement =
                engagementRepository.findForProviderForUpdate(
                        engagementId, provider.getId()
                ).orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Engagement not found"
                        )
                );

        if (engagement.getStatus() != EngagementStatus.CONFIRMED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Only confirmed engagements can be started"
            );
        }

        if (engagement.getApplication().getJobPost().getStatus()
                == JobPostStatus.CANCELLED) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This job has been cancelled"
            );
        }

        engagement.setStatus(EngagementStatus.IN_PROGRESS);
        engagement.setStartedAt(LocalDateTime.now());
        conversationService.addSystemEventForApplication(engagement.getApplication().getId(), "Assignment started.");
        notificationService.createNotification(
                engagement.getApplication().getSeekerProfile().getUser(),
                NotificationType.JOB_UPDATED,
                "Work has started",
                "Your assignment “" + engagement.getApplication().getJobPost().getTitle() + "” is now in progress.",
                "ENGAGEMENT",
                engagement.getId()
        );

        return mapToResponse(engagement);
    }

    // Provider confirms work completion
    @Transactional
    public WorkerEngagementResponse confirmCompletionByProvider(
            Long engagementId) {

        ProviderProfile provider =
                currentUserService.getCurrentProviderProfile();

        WorkerEngagement engagement =
                engagementRepository.findForProviderForUpdate(
                        engagementId, provider.getId()
                ).orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Engagement not found"
                        )
                );

        if (engagement.getStatus() != EngagementStatus.IN_PROGRESS || !engagement.isSeekerCompletionConfirmed()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The worker must request completion before you confirm it");
        }
        engagement.setProviderCompletionConfirmed(true);
        return completeEngagement(engagement, "provider");
    }

    // Seeker confirms work completion
    @Transactional
    public WorkerEngagementResponse confirmCompletionBySeeker(
            Long engagementId) {

        SeekerProfile seeker =
                currentUserService.getCurrentSeekerProfile();

        WorkerEngagement engagement =
                engagementRepository.findForSeekerForUpdate(
                        engagementId, seeker.getId()
                ).orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Engagement not found"
                        )
                );

        if (!engagement.isProviderCompletionConfirmed()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The provider must submit completion before you confirm it");
        }
        engagement.setSeekerCompletionConfirmed(true);
        return completeEngagement(engagement, "worker");
    }

    @Transactional
    public WorkerEngagementResponse requestCompletionBySeeker(Long engagementId) {
        SeekerProfile seeker = currentUserService.getCurrentSeekerProfile();
        WorkerEngagement engagement = engagementRepository.findForSeekerForUpdate(engagementId, seeker.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Engagement not found"));
        return requestCompletion(engagement, false);
    }

    @Transactional
    public WorkerEngagementResponse requestCompletionByProvider(Long engagementId) {
        ProviderProfile provider = currentUserService.getCurrentProviderProfile();
        WorkerEngagement engagement = engagementRepository.findForProviderForUpdate(engagementId, provider.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Engagement not found"));
        return requestCompletion(engagement, true);
    }

    private WorkerEngagementResponse requestCompletion(WorkerEngagement engagement, boolean providerSubmitted) {
        if (engagement.getStatus() == EngagementStatus.IN_PROGRESS && (providerSubmitted ? engagement.isProviderCompletionConfirmed() : engagement.isSeekerCompletionConfirmed())) return mapToResponse(engagement);
        if (engagement.getStatus() != EngagementStatus.IN_PROGRESS) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Work must be in progress before completion confirmation"
            );
        }
        if (providerSubmitted) engagement.setProviderCompletionConfirmed(true);
        else engagement.setSeekerCompletionConfirmed(true);
        String submitter = providerSubmitted ? "Provider" : "Worker";
        conversationService.addSystemEventForApplication(engagement.getApplication().getId(), submitter + " submitted a work completion request.");
        notificationService.createNotification(
                providerSubmitted ? engagement.getApplication().getSeekerProfile().getUser() : engagement.getApplication().getJobPost().getProviderProfile().getUser(),
                NotificationType.COMPLETION_REQUESTED,
                "Completion needs your review",
                submitter + " marked “" + engagement.getApplication().getJobPost().getTitle() + "” as complete. Review and confirm the work.",
                "ENGAGEMENT",
                engagement.getId()
        );
        return mapToResponse(engagement);
    }

    private WorkerEngagementResponse completeEngagement(WorkerEngagement engagement, String confirmingParty) {
        engagement.setStatus(EngagementStatus.COMPLETED);
        engagement.setProviderCompletionConfirmed(true);
        engagement.setSeekerCompletionConfirmed(true);
        engagement.setCompletedAt(LocalDateTime.now());
        String title = "Work completion confirmed";
        String message = "Both sides confirmed completion of “" + engagement.getApplication().getJobPost().getTitle() + "”.";
        conversationService.addSystemEventForApplication(engagement.getApplication().getId(), "Work completion confirmed by the " + confirmingParty + ".");
        notificationService.createNotification(engagement.getApplication().getJobPost().getProviderProfile().getUser(), NotificationType.COMPLETION_CONFIRMED, title, message, "ENGAGEMENT", engagement.getId());
        notificationService.createNotification(engagement.getApplication().getSeekerProfile().getUser(), NotificationType.COMPLETION_CONFIRMED, title, message, "ENGAGEMENT", engagement.getId());
        return mapToResponse(engagement);
    }


    @Transactional(readOnly = true)
    public ProviderContactResponse getProviderContact(Long engagementId) {

        SeekerProfile seeker =
                currentUserService.getCurrentSeekerProfile();

        WorkerEngagement engagement =
                engagementRepository.findForSeeker(
                        engagementId, seeker.getId()
                ).orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Engagement not found"
                        )
                );

        if (engagement.getStatus() != EngagementStatus.CONFIRMED &&
                engagement.getStatus() != EngagementStatus.IN_PROGRESS &&
                engagement.getStatus() != EngagementStatus.COMPLETED) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Provider contact is available only after confirmation"
            );
        }

        ProviderProfile provider =
                engagement.getApplication()
                        .getJobPost()
                        .getProviderProfile();

        User providerUser = provider.getUser();

        return new ProviderContactResponse(
                providerUser.getFullName(),
                providerUser.getPhoneNumber(),
                provider.getBusinessName(),
                provider.getBusinessLocation()
        );
    }


}
