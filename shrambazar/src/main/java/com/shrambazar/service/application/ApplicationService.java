
package com.shrambazar.service.application;

import com.shrambazar.dto.application.*;
import com.shrambazar.entity.*;
import com.shrambazar.enums.ApplicationStatus;
import com.shrambazar.enums.JobPostStatus;
import com.shrambazar.enums.NotificationType;
import com.shrambazar.repository.*;
import com.shrambazar.service.CurrentUserService;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.shrambazar.service.notification.NotificationService;

@Service
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final JobPostRepository jobPostRepository;
    private final SeekerSkillRepository seekerSkillRepository;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;
    private final ApplicationConfirmationEmailService confirmationEmailService;

    private static final Logger log =
            LoggerFactory.getLogger(ApplicationService.class);

    public ApplicationService(
            ApplicationRepository applicationRepository,
            JobPostRepository jobPostRepository,
            SeekerSkillRepository seekerSkillRepository,
            CurrentUserService currentUserService,
            NotificationService notificationService,
            ApplicationConfirmationEmailService confirmationEmailService) {

        this.applicationRepository = applicationRepository;
        this.jobPostRepository = jobPostRepository;
        this.seekerSkillRepository = seekerSkillRepository;
        this.currentUserService = currentUserService;
        this.notificationService = notificationService;
        this.confirmationEmailService = confirmationEmailService;
    }

    // Seeker applies for a job
    @Transactional
    public ApplicationResponse applyForJob(Long jobId, OfferRequest offer) {

        SeekerProfile seeker =
                currentUserService.getCurrentSeekerProfile();

        if (!seeker.isAcceptingWork()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "New offers are paused for your worker profile");
        }

        JobPost job = jobPostRepository.findById(jobId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Job not found"
                        )
                );

        if (job.getStatus() != JobPostStatus.OPEN ||
                job.getEndDate().isBefore(LocalDate.now())) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This job is no longer accepting applications"
            );
        }

        // Check whether the seeker has already applied
        if (applicationRepository.existsForJobAndSeeker(jobId, seeker.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "You have already applied for this job"
            );
        }

        // Create new application
        Application application = new Application();

        application.setJobPost(job);
        application.setSeekerProfile(seeker);
        application.setStatus(ApplicationStatus.PENDING);
        if (offer != null) {
            if (offer.proposedStartAt() != null && offer.proposedStartAt().toLocalDate().isBefore(LocalDate.now())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Proposed availability must be today or later");
            }
            if ((offer.offeredAmount() == null) != (offer.estimatedDurationHours() == null)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provide both an offer amount and estimated duration, or leave both blank.");
            }
            application.setOfferedAmount(offer.offeredAmount());
            application.setOfferMessage(offer.message() == null ? null : offer.message().trim());
            application.setEstimatedDurationHours(offer.estimatedDurationHours());
            application.setProposedStartAt(offer.proposedStartAt());
        }

        String name = clean(offer == null ? null : offer.applicantName(), seeker.getUser().getFullName(), 120);
        String email = clean(offer == null ? null : offer.applicantEmail(), seeker.getUser().getEmail(), 254);
        String phone = clean(offer == null ? null : offer.applicantPhone(), seeker.getUser().getPhoneNumber(), 32);
        String location = clean(offer == null ? null : offer.applicantLocation(), seeker.getAddress(), 255);
        String introduction = clean(offer == null ? null : offer.introduction(), offer == null ? null : offer.message(), 1200);
        List<String> skills = offer != null && offer.skills() != null && !offer.skills().isEmpty()
                ? offer.skills().stream().map(String::trim).filter(value -> !value.isBlank()).distinct().limit(20).toList()
                : seekerSkillRepository.findBySeekerProfileId(seeker.getId()).stream()
                    .map(seekerSkill -> seekerSkill.getSkill().getName()).distinct().limit(20).toList();
        String experience = clean(offer == null ? null : offer.experienceLevel(), "No Experience", 32);
        boolean applicationDetailsProvided = offer != null && (offer.applicantName() != null || offer.applicantEmail() != null
                || offer.applicantPhone() != null || offer.applicantLocation() != null || offer.skills() != null
                || offer.experienceLevel() != null || offer.introduction() != null);
        if (name.isBlank() || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")
                || !phone.matches("^(?:\\+?977[- ]?)?9[0-9]{9}$") || location.isBlank()
                || introduction.isBlank() || (applicationDetailsProvided && skills.isEmpty())
                || !List.of("No Experience", "Beginner", "Experienced").contains(experience)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Complete valid name, email, Nepali mobile number, location, skills, experience, and introduction before applying.");
        }
        application.setApplicantName(name);
        application.setApplicantEmail(email);
        application.setApplicantPhone(phone);
        application.setApplicantLocation(location);
        application.setApplicantSkills(skills);
        application.setExperienceLevel(experience);
        application.setIntroduction(introduction);

        Application saved = applicationRepository.save(application);

        notificationService.createNotification(
                job.getProviderProfile().getUser(),
                NotificationType.APPLICATION_SUBMITTED,
                "New job application",
                seeker.getUser().getFullName()
                        + " applied for your job: " + job.getTitle(),
                "APPLICATION",
                saved.getId()
        );

        boolean emailSent = confirmationEmailService.sendApplicationConfirmation(saved);
        return mapToResponse(saved, emailSent);
    }

    // Seeker views all own applications
    @Transactional(readOnly = true)
    public List<ApplicationResponse> getMyApplications() {

        SeekerProfile seeker =
                currentUserService.getCurrentSeekerProfile();

        return applicationRepository
                .findBySeekerProfileIdOrderByAppliedAtDesc(seeker.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // Seeker views one of their applications
    @Transactional(readOnly = true)
    public ApplicationResponse getMyApplication(Long applicationId) {

        SeekerProfile seeker =
                currentUserService.getCurrentSeekerProfile();

        Application application =
                applicationRepository.findByIdAndSeekerProfileId(
                        applicationId, seeker.getId()
                ).orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Application not found"
                        )
                );

        return mapToResponse(application);
    }

    // Seeker withdraws a pending application
    @Transactional
    public void withdrawApplication(Long applicationId) {

        SeekerProfile seeker =
                currentUserService.getCurrentSeekerProfile();

        Application application =
                applicationRepository.findByIdAndSeekerProfileId(
                        applicationId, seeker.getId()
                ).orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Application not found"
                        )
                );

        if (application.getStatus() != ApplicationStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Only pending applications can be withdrawn"
            );
        }

        application.setStatus(ApplicationStatus.WITHDRAWN);

        notificationService.createNotification(
                application.getJobPost().getProviderProfile().getUser(),
                NotificationType.APPLICATION_WITHDRAWN,
                "Application withdrawn",
                application.getSeekerProfile().getUser().getFullName()
                        + " withdrew their application for "
                        + application.getJobPost().getTitle(),
                "APPLICATION",
                application.getId()
        );
    }

    // Provider views applicants for their own job
    @Transactional(readOnly = true)
    public List<ApplicantResponse> getJobApplicants(Long jobId) {

        ProviderProfile provider =
                currentUserService.getCurrentProviderProfile();

        jobPostRepository.findByIdAndProviderProfileId(
                jobId, provider.getId()
        ).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Job not found"
                )
        );

        return applicationRepository
                .findByJobPostIdOrderByAppliedAtDesc(jobId)
                .stream()
                .map(this::mapToApplicantResponse)
                .toList();
    }

    // Provider rejects a pending applicant
    @Transactional
    public void rejectApplication(Long jobId, Long applicationId) {

        ProviderProfile provider =
                currentUserService.getCurrentProviderProfile();

        jobPostRepository.findByIdAndProviderProfileId(
                jobId, provider.getId()
        ).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Job not found"
                )
        );

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
                    "Only pending applications can be rejected"
            );
        }

        application.setStatus(ApplicationStatus.NOT_SELECTED);

        notificationService.createNotification(
                application.getSeekerProfile().getUser(),
                NotificationType.APPLICATION_REJECTED,
                "Application update",
                "Your application for "
                        + application.getJobPost().getTitle()
                        + " was not selected.",
                "APPLICATION",
                application.getId()
        );
    }

    private ApplicationResponse mapToResponse(Application application) {
        return mapToResponse(application, false);
    }

    private ApplicationResponse mapToResponse(Application application, boolean confirmationEmailSent) {

        JobPost job = application.getJobPost();

        return new ApplicationResponse(
                application.getId(),
                job.getId(),
                job.getTitle(),
                job.getAddress(),
                job.getDistrict(),
                job.getStartDate(),
                job.getEndDate(),
                job.getPaymentAmount(),
                job.getPaymentMethod(),
                application.getStatus(),
                application.getAppliedAt(),
                application.getOfferedAmount(),
                application.getOfferMessage(),
                application.getEstimatedDurationHours(),
                application.getProposedStartAt(),
                application.getApplicantName(),
                application.getApplicantEmail(),
                application.getApplicantPhone(),
                application.getApplicantLocation(),
                application.getApplicantSkills(),
                application.getExperienceLevel(),
                application.getIntroduction(),
                confirmationEmailSent
        );
    }

    private static String clean(String value, String fallback, int maxLength) {
        String cleaned = value == null || value.isBlank() ? (fallback == null ? "" : fallback.trim()) : value.trim();
        return cleaned.length() <= maxLength ? cleaned : cleaned.substring(0, maxLength);
    }

    private ApplicantResponse mapToApplicantResponse(
            Application application) {

        SeekerProfile profile = application.getSeekerProfile();

        List<String> skills = seekerSkillRepository
                .findBySeekerProfileId(profile.getId())
                .stream()
                .map(seekerSkill -> seekerSkill.getSkill().getName())
                .toList();

        return new ApplicantResponse(
                application.getId(),
                profile.getUser().getId(),
                profile.getUser().getFullName(),
                profile.getProfilePictureUrl(),
                profile.getBio(),
                application.getApplicantSkills() == null || application.getApplicantSkills().isEmpty() ? skills : application.getApplicantSkills(),
                application.getStatus(),
                application.getAppliedAt(),
                application.getOfferedAmount(),
                application.getOfferMessage(),
                application.getEstimatedDurationHours(),
                application.getProposedStartAt(),
                application.getApplicantName(),
                application.getApplicantEmail(),
                application.getApplicantPhone(),
                application.getApplicantLocation(),
                application.getApplicantSkills(),
                application.getExperienceLevel(),
                application.getIntroduction()
        );
    }
}
