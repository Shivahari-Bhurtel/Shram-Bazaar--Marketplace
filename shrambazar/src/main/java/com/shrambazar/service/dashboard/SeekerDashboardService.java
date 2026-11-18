package com.shrambazar.service.dashboard;

import com.shrambazar.dto.dashboard.RecommendedJobResponse;
import com.shrambazar.entity.*;
import com.shrambazar.enums.JobPostStatus;
import com.shrambazar.repository.*;
import com.shrambazar.service.CurrentUserService;
import com.shrambazar.service.calendar.SeekerCalendarService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;


@Service
public class SeekerDashboardService {

    private final CurrentUserService currentUserService;
    private final JobPostRepository jobPostRepository;
    private final SeekerSkillRepository seekerSkillRepository;
    private final AvailabilityRepository availabilityRepository;
    private final JobPostSkillRepository jobPostSkillRepository;
    private final SavedJobRepository savedJobRepository;
    private final SeekerCalendarService seekerCalendarService;
    private final ApplicationRepository applicationRepository;

    public SeekerDashboardService(
            CurrentUserService currentUserService,
            JobPostRepository jobPostRepository,
            SeekerSkillRepository seekerSkillRepository,
            AvailabilityRepository availabilityRepository,
            JobPostSkillRepository jobPostSkillRepository,
            SavedJobRepository savedJobRepository,
            SeekerCalendarService seekerCalendarService,
            ApplicationRepository applicationRepository
    ) {
        this.currentUserService = currentUserService;
        this.jobPostRepository = jobPostRepository;
        this.seekerSkillRepository = seekerSkillRepository;
        this.availabilityRepository = availabilityRepository;
        this.jobPostSkillRepository = jobPostSkillRepository;
        this.savedJobRepository = savedJobRepository;
        this.seekerCalendarService = seekerCalendarService;
        this.applicationRepository = applicationRepository;
    }

    @Transactional(readOnly = true)
    public List<RecommendedJobResponse> getDashboard() {

        SeekerProfile seekerProfile =
                currentUserService.getCurrentSeekerProfile();

        Long seekerProfileId = seekerProfile.getId();
        Long currentUserId = seekerProfile.getUser().getId();

        Set<String> seekerSkills = seekerSkillRepository
                .findBySeekerProfileId(seekerProfileId)
                .stream()
                .map(seekerSkill -> seekerSkill.getSkill().getName())
                .filter(Objects::nonNull)
                .map(String::toLowerCase)
                .collect(Collectors.toSet());


        List<JobPost> openJobs =
                jobPostRepository.findByStatusOrderByCreatedAtDesc(
                        JobPostStatus.OPEN
                );

        return openJobs.stream()

                // Exclude expired jobs.
                .filter(job -> job.getEndDate() == null
                        || !job.getEndDate().isBefore(LocalDate.now()))

                // Do not recommend the seeker's own provider posts.
                .filter(job -> !job.getProviderProfile()
                        .getUser().getId().equals(currentUserId))

                // Exclude jobs the seeker has already applied to.
                .filter(job -> !applicationRepository
                        .existsByJobPostIdAndSeekerProfileId(
                                job.getId(),
                                seekerProfileId
                        ))

                .map(job -> {
                    List<JobPostSkill> jobSkills =
                            jobPostSkillRepository.findByJobPostId(job.getId());

                    int score = calculateScore(
                            seekerProfile,
                            job,
                            jobSkills,
                            seekerSkills,
                            seekerProfile.getAddress()
                    );

                    boolean saved =
                            savedJobRepository.existsBySeekerProfileIdAndJobPostId(
                                    seekerProfileId,
                                    job.getId()
                            );

                    return new ScoredJob(
                            job,
                            score,
                            mapToResponse(job, jobSkills, saved)
                    );
                })

// Sort by highest recommendation score first.
                .sorted(
                        Comparator.comparingInt(ScoredJob::score)
                                .reversed()
                                .thenComparing(
                                        scoredJob -> scoredJob.job().getCreatedAt(),
                                        Comparator.nullsLast(Comparator.reverseOrder())
                                )
                )

// Convert ScoredJob into RecommendedJobResponse.
                .map(ScoredJob::response)
                .toList();

    }

    private int calculateScore(
            SeekerProfile seeker,
            JobPost job,
            List<JobPostSkill> jobSkills,
            Set<String> seekerSkills,
            String seekerAddress
    ) {
        int score = 0;

        // Skill matching: 3 points for each matching skill.
        for (JobPostSkill jobSkill : jobSkills) {

            String requiredSkill =
                    jobSkill.getSkill().getName().toLowerCase();

            if (seekerSkills.contains(requiredSkill)) {
                score += 3;
            }
        }

        // Location matching: 2 additional points.
        if (matchesLocation(job, seekerAddress)) {
            score += 2;
        }

        // Availability matching: 2 additional points.
        if (seekerCalendarService.isAvailableForJob(seeker, job)) {
            score += 2;
        }

        return score;
    }

    private boolean matchesLocation(JobPost job, String seekerAddress) {

        if (seekerAddress == null || seekerAddress.isBlank()) {
            return false;
        }

        String[] addressParts = seekerAddress.toLowerCase().split(",");

        return Arrays.stream(addressParts)
                .map(String::trim)
                .filter(part -> !part.isBlank())
                .anyMatch(part ->
                        containsIgnoreCase(job.getDistrict(), part)
                                || containsIgnoreCase(job.getMunicipality(), part)
                                || containsIgnoreCase(job.getProvince(), part)
                );
    }

    private boolean containsIgnoreCase(
            String location,
            String address
    ) {
        if (location == null || location.isBlank()) {
            return false;
        }

        String normalizedLocation = location.toLowerCase();

        return normalizedLocation.contains(address)
                || address.contains(normalizedLocation);
    }

    private RecommendedJobResponse mapToResponse(
            JobPost job,
            List<JobPostSkill> jobSkills,
            boolean saved
    ) {
        List<String> requiredSkills = jobSkills.stream()
                .map(jobSkill -> jobSkill.getSkill().getName())
                .toList();

        return new RecommendedJobResponse(
                job.getId(),
                job.getTitle(),
                job.getDescription(),
                job.getResponsibilities(),
                job.getAddress(),
                job.getMunicipality(),
                job.getDistrict(),
                job.getProvince(),
                job.getStartDate(),
                job.getEndDate(),
                job.getStartTime(),
                job.getEndTime(),
                job.getDurationDescription(),
                job.getPaymentAmount(),
                job.getPaymentMethod(),
                job.getNumberOfWorkersRequired(),
                requiredSkills,
                saved
        );
    }

    private record ScoredJob(
            JobPost job,
            int score,
            RecommendedJobResponse response
    ) {
    }
}