
package com.shrambazar.service.job;

import com.shrambazar.dto.job.*;
import com.shrambazar.entity.*;
import com.shrambazar.enums.JobPostStatus;
import com.shrambazar.repository.*;
import com.shrambazar.service.CurrentUserService;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;

import com.shrambazar.enums.ApplicationStatus;
import com.shrambazar.enums.EngagementStatus;
import com.shrambazar.enums.NotificationType;
import com.shrambazar.repository.ApplicationRepository;
import com.shrambazar.service.notification.NotificationService;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

@Service
public class JobPostService {

    private final JobPostRepository jobPostRepository;
    private final JobPostSkillRepository jobPostSkillRepository;
    private final SkillRepository skillRepository;
    private final CurrentUserService currentUserService;
    private final ApplicationRepository applicationRepository;
    private final WorkerEngagementRepository engagementRepository;
    private final NotificationService notificationService;

    public JobPostService(
            JobPostRepository jobPostRepository,
            JobPostSkillRepository jobPostSkillRepository,
            SkillRepository skillRepository,
            CurrentUserService currentUserService,
            ApplicationRepository applicationRepository,
            WorkerEngagementRepository engagementRepository,
            NotificationService notificationService) {

        this.jobPostRepository = jobPostRepository;
        this.jobPostSkillRepository = jobPostSkillRepository;
        this.skillRepository = skillRepository;
        this.currentUserService = currentUserService;
        this.applicationRepository = applicationRepository;
        this.engagementRepository = engagementRepository;
        this.notificationService = notificationService;
    }

    // Create and publish a job
    @Transactional
    public JobPostResponse createJob(JobPostRequest request) {

        validateRequest(request);

        ProviderProfile provider =
                currentUserService.getCurrentProviderProfile();

        JobPost job = new JobPost();

        job.setProviderProfile(provider);
        applyRequest(job, request);

        job.setStatus(JobPostStatus.OPEN);
        job.setPublishedAt(LocalDateTime.now());

        JobPost savedJob = jobPostRepository.save(job);

        saveJobSkills(savedJob, resolveRequiredSkillIds(request));

        return mapToResponse(savedJob);
    }

    // View provider's own jobs
    @Transactional(readOnly = true)
    public List<JobPostResponse> getMyJobs() {

        ProviderProfile provider =
                currentUserService.getCurrentProviderProfile();

        return jobPostRepository
                .findByProviderProfileIdOrderByCreatedAtDesc(provider.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // Update an existing job
    @Transactional
    public JobPostResponse updateJob(
            Long jobId,
            JobPostRequest request) {

        validateRequest(request);

        ProviderProfile provider =
                currentUserService.getCurrentProviderProfile();

        JobPost job = getOwnedJob(jobId, provider.getId());

        if (job.getStatus() != JobPostStatus.OPEN &&
                job.getStatus() != JobPostStatus.DRAFT) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Only active job posts can be edited"
            );
        }

        applyRequest(job, request);

        replaceJobSkills(job, resolveRequiredSkillIds(request));

        notifyApplicants(
                job,
                NotificationType.JOB_UPDATED,
                "Job updated",
                "The job \"" + job.getTitle() + "\" has been updated. Please review the latest details."
        );

        return mapToResponse(job);
    }

    // Close a job
    @Transactional
    public void closeJob(Long jobId) {

        ProviderProfile provider =
                currentUserService.getCurrentProviderProfile();

        JobPost job = getOwnedJob(jobId, provider.getId());

        if (job.getStatus() != JobPostStatus.OPEN) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Only open jobs can be closed"
            );
        }

        job.setStatus(JobPostStatus.CLOSED);
    }

    // Cancel a job
    @Transactional
    public void cancelJob(Long jobId) {

        ProviderProfile provider =
                currentUserService.getCurrentProviderProfile();

        JobPost job = getOwnedJob(jobId, provider.getId());

        if (job.getStatus() != JobPostStatus.OPEN &&
                job.getStatus() != JobPostStatus.DRAFT &&
                job.getStatus() != JobPostStatus.ASSIGNED) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This job cannot be cancelled"
            );
        }

        job.setStatus(JobPostStatus.CANCELLED);
        engagementRepository.findByApplicationJobPostId(jobId).forEach(engagement -> {
            if (engagement.getStatus() == EngagementStatus.AWAITING_RESPONSE
                    || engagement.getStatus() == EngagementStatus.CONFIRMED
                    || engagement.getStatus() == EngagementStatus.IN_PROGRESS) {
                engagement.setStatus(EngagementStatus.CANCELLED);
                engagement.setCancelledAt(LocalDateTime.now());
            }
        });

        notifyApplicants(
                job,
                NotificationType.JOB_CANCELLED,
                "Job cancelled",
                "The job \"" + job.getTitle() + "\" has been cancelled by the provider."
        );
    }

    // Public job browsing with basic filters
    @Transactional(readOnly = true)
    public List<JobPostResponse> searchJobs(
            String keyword,
            String district,
            BigDecimal minPayment,
            BigDecimal maxPayment,
            LocalDate workDate) {

        return jobPostRepository
                .findByStatusInOrderByCreatedAtDesc(List.of(JobPostStatus.OPEN, JobPostStatus.ASSIGNED))
                .stream()

                .filter(job -> matchesKeyword(job, keyword))

                .filter(job -> district == null ||
                        containsIgnoreCase(job.getDistrict(), district))

                .filter(job -> minPayment == null || job.getPaymentAmount() == null ||
                        job.getPaymentAmount().compareTo(minPayment) >= 0)

                .filter(job -> maxPayment == null || job.getPaymentAmount() == null ||
                        job.getPaymentAmount().compareTo(maxPayment) <= 0)

                .filter(job -> workDate == null ||
                        (!workDate.isBefore(job.getStartDate()) &&
                                !workDate.isAfter(job.getEndDate())))

                .map(this::mapToResponse)
                .toList();
    }

    // Public job details
    @Transactional(readOnly = true)
    public JobPostResponse getPublicJob(Long jobId) {

        JobPost job = jobPostRepository.findById(jobId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Job not found"
                        )
                );

        if (job.getStatus() != JobPostStatus.OPEN && job.getStatus() != JobPostStatus.ASSIGNED) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Job is not available"
            );
        }

        return mapToResponse(job);
    }

    // Helper: find a job belonging to the authenticated provider
    private JobPost getOwnedJob(Long jobId, Long providerId) {

        return jobPostRepository
                .findByIdAndProviderProfileId(jobId, providerId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Job not found"
                        )
                );
    }

    // Helper: validate job data
    private void validateRequest(JobPostRequest request) {

        boolean negotiable = Boolean.TRUE.equals(request.budgetNegotiable());
        if (!negotiable && request.paymentAmount() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a task budget or choose open to offers.");
        }
        if (request.paymentAmount() != null && request.paymentMaxAmount() != null && request.paymentMaxAmount().compareTo(request.paymentAmount()) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Maximum budget must be at least the minimum budget.");
        }
        if (negotiable && request.paymentMaxAmount() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Open to offers cannot include a fixed maximum budget.");
        }

        if (request.endDate().isBefore(request.startDate())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "End date cannot be before start date"
            );
        }

        if (request.startDate().equals(request.endDate()) &&
                !request.endTime().isAfter(request.startTime())) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "End time must be after start time"
            );
        }

        if (request.requiredSkillIds() != null) {
            long distinctCount = request.requiredSkillIds()
                    .stream()
                    .distinct()
                    .count();

            if (distinctCount != request.requiredSkillIds().size()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Duplicate required skills are not allowed"
                );
            }

            if (skillRepository.findAllById(request.requiredSkillIds())
                    .size() != distinctCount) {

                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "One or more skills were not found"
                );
            }
        }
    }

    // Helper: apply request fields
    private void applyRequest(
            JobPost job,
            JobPostRequest request) {

        job.setTitle(request.title().trim());
        job.setCategory(request.category());
        job.setQualificationRequired(request.qualificationRequired());
        job.setDescription(request.description());
        job.setResponsibilities(request.responsibilities());

        job.setAddress(request.address());
        job.setMunicipality(request.municipality());
        job.setDistrict(request.district());
        job.setProvince(request.province());
        job.setLatitude(request.latitude());
        job.setLongitude(request.longitude());

        job.setStartDate(request.startDate());
        job.setEndDate(request.endDate());
        job.setStartTime(request.startTime());
        job.setEndTime(request.endTime());

        job.setDurationDescription(request.durationDescription());

        job.setPaymentAmount(request.paymentAmount());
        job.setPaymentMaxAmount(request.paymentMaxAmount());
        job.setBudgetNegotiable(Boolean.TRUE.equals(request.budgetNegotiable()));
        job.setPaymentPeriod(request.paymentPeriod());
        job.setPaymentMethod(request.paymentMethod());



        job.setRequiredExperienceMonths(
                request.requiredExperienceMonths()
        );

        job.setNumberOfWorkersRequired(
                request.numberOfWorkersRequired()
        );
    }

    // Helper: save required skills
    private void saveJobSkills(JobPost job, List<Long> skillIds) {

        if (skillIds == null || skillIds.isEmpty()) {
            return;
        }

        List<Skill> skills = skillRepository.findAllById(skillIds);

        for (Skill skill : skills) {
            JobPostSkill jobSkill = new JobPostSkill();
            jobSkill.setJobPost(job);
            jobSkill.setSkill(skill);
            jobSkill.setRequired(true);

            jobPostSkillRepository.save(jobSkill);
        }
    }

    private List<Long> resolveRequiredSkillIds(JobPostRequest request) {
        Set<Long> resolvedIds = new LinkedHashSet<>(request.requiredSkillIds() == null
                ? List.of()
                : request.requiredSkillIds());
        if (request.requiredSkills() == null) return List.copyOf(resolvedIds);

        Set<String> seenNames = new LinkedHashSet<>();
        for (String rawName : request.requiredSkills()) {
            String name = rawName.trim().replaceAll("\\s+", " ");
            String normalizedName = name.toLowerCase(Locale.ROOT);
            if (name.isEmpty() || !seenNames.add(normalizedName)) continue;

            Skill skill = skillRepository.findByNameIgnoreCase(name).orElseGet(() -> {
                Skill newSkill = new Skill();
                newSkill.setName(name);
                return skillRepository.save(newSkill);
            });
            resolvedIds.add(skill.getId());
        }
        return List.copyOf(resolvedIds);
    }

    // Helper: replace existing required skills
    private void replaceJobSkills(
            JobPost job,
            List<Long> skillIds) {

        List<JobPostSkill> existing =
                jobPostSkillRepository.findByJobPostId(job.getId());

        jobPostSkillRepository.deleteAllInBatch(existing);

        saveJobSkills(job, skillIds);
    }

    // Helper: map entity to response
    private JobPostResponse mapToResponse(JobPost job) {

        List<String> requiredSkills =
                jobPostSkillRepository.findByJobPostId(job.getId())
                        .stream()
                        .map(jobSkill -> jobSkill.getSkill().getName())
                        .toList();

        return new JobPostResponse(
                job.getId(),
                job.getProviderProfile().getUser().getFullName(),
                job.getProviderProfile().getBusinessName(),

                job.getTitle(),
                job.getCategory(),
                job.getQualificationRequired(),
                job.getDescription(),
                job.getResponsibilities(),

                job.getAddress(),
                job.getMunicipality(),
                job.getDistrict(),
                job.getProvince(),
                job.getLatitude(),
                job.getLongitude(),

                job.getStartDate(),
                job.getEndDate(),
                job.getStartTime(),
                job.getEndTime(),
                job.getDurationDescription(),

                job.getPaymentAmount(),
                job.getPaymentMaxAmount(),
                job.isBudgetNegotiable(),
                job.getPaymentPeriod(),
                job.getPaymentMethod(),

                job.getRequiredExperienceMonths(),
                job.getNumberOfWorkersRequired(),

                requiredSkills,

                applicationRepository.countByJobPostId(job.getId()),

                job.getStatus(),
                job.getCreatedAt(),
                job.getPublishedAt()
        );
    }

    private boolean matchesKeyword(JobPost job, String keyword) {

        if (keyword == null || keyword.isBlank()) {
            return true;
        }

        return containsIgnoreCase(job.getTitle(), keyword) ||
                containsIgnoreCase(job.getDescription(), keyword) ||
                containsIgnoreCase(job.getResponsibilities(), keyword);
    }

    private boolean containsIgnoreCase(String value, String search) {

        return value != null &&
                value.toLowerCase().contains(search.toLowerCase());
    }

    private void notifyApplicants(
            JobPost job,
            NotificationType type,
            String title,
            String message) {

        List<Application> applications =
                applicationRepository.findByJobPostId(job.getId());

        for (Application application : applications) {

            ApplicationStatus status = application.getStatus();

            if (status == ApplicationStatus.PENDING ||
                    status == ApplicationStatus.SELECTED) {

                notificationService.createNotification(
                        application.getSeekerProfile().getUser(),
                        type,
                        title,
                        message,
                        "JOB_POST",
                        job.getId()
                );
            }
        }
    }

    // View provider's active jobs with pagination
    @Transactional(readOnly = true)
    public Page<JobPostResponse> getMyActiveJobs(int page) {

        if (page < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Page number cannot be negative"
            );
        }

        ProviderProfile provider =
                currentUserService.getCurrentProviderProfile();

        return jobPostRepository
                .findByProviderProfileIdAndStatus(
                        provider.getId(),
                        JobPostStatus.OPEN,
                        PageRequest.of(
                                page,
                                5,
                                Sort.by(Sort.Direction.DESC, "createdAt")
                        )
                )
                .map(this::mapToResponse);
    }
}
