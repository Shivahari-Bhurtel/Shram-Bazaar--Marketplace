
package com.shrambazar.service.dashboard;

import com.shrambazar.dto.dashboard.WorkerSearchRequest;
import com.shrambazar.dto.dashboard.WorkerSearchResponse;
import com.shrambazar.entity.*;
import com.shrambazar.enums.*;
import com.shrambazar.repository.*;
import com.shrambazar.service.CurrentUserService;
import com.shrambazar.service.calendar.SeekerCalendarService;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class WorkerSearchService {

    private final SeekerProfileRepository seekerProfileRepository;
    private final SeekerSkillRepository seekerSkillRepository;
    private final QualificationRepository qualificationRepository;
    private final WorkExperienceRepository workExperienceRepository;
    private final ReviewRepository reviewRepository;
    private final VerificationRequestRepository verificationRequestRepository;
    private final CurrentUserService currentUserService;
    private final SeekerCalendarService seekerCalendarService;

    public WorkerSearchService(
            SeekerProfileRepository seekerProfileRepository,
            SeekerSkillRepository seekerSkillRepository,
            QualificationRepository qualificationRepository,
            WorkExperienceRepository workExperienceRepository,
            ReviewRepository reviewRepository,
            VerificationRequestRepository verificationRequestRepository,
            CurrentUserService currentUserService,
            SeekerCalendarService seekerCalendarService
    ) {
        this.seekerProfileRepository = seekerProfileRepository;
        this.seekerSkillRepository = seekerSkillRepository;
        this.qualificationRepository = qualificationRepository;
        this.workExperienceRepository = workExperienceRepository;
        this.reviewRepository = reviewRepository;
        this.verificationRequestRepository = verificationRequestRepository;
        this.currentUserService = currentUserService;
        this.seekerCalendarService = seekerCalendarService;
    }

    @Transactional(readOnly = true)
    public List<WorkerSearchResponse> searchWorkers(
            WorkerSearchRequest request
    ) {

        currentUserService.getCurrentProviderProfile();

        validateRequest(request);

        return seekerProfileRepository.findAll()
                .stream()
                .filter(seeker ->
                        seeker.getUser().getStatus() == AccountStatus.ACTIVE
                )
                .filter(seeker -> matchesSkills(seeker, request))
                .filter(seeker -> matchesLocation(seeker, request))
                .filter(seeker -> matchesVerification(seeker, request))
                .filter(seeker -> matchesRating(seeker, request))
                .filter(seeker -> matchesEducation(seeker, request))
                .filter(seeker -> matchesExperience(seeker, request))
                .filter(seeker -> matchesMinimumExperience(seeker, request))
                .filter(seeker -> matchesAvailability(seeker, request))
                .map(this::mapToResponse)
                .sorted(
                        Comparator.comparing(
                                WorkerSearchResponse::getAverageRating,
                                Comparator.nullsLast(
                                        Comparator.reverseOrder()
                                )
                        ).thenComparing(
                                WorkerSearchResponse::getFullName
                        )
                )
                .toList();
    }

    private void validateRequest(WorkerSearchRequest request) {

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Search filters are required."
            );
        }

        if (request.getMinRating() != null
                && (request.getMinRating() < 1
                || request.getMinRating() > 5)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Minimum rating must be between 1 and 5."
            );
        }

        if (request.getMinExperienceYears() != null
                && request.getMinExperienceYears() < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Minimum experience cannot be negative."
            );
        }

        boolean hasDate = request.getAvailabilityDate() != null;
        boolean hasStart = request.getStartTime() != null;
        boolean hasEnd = request.getEndTime() != null;

        if (hasDate != hasStart || hasDate != hasEnd) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Availability date, start time and end time must all be provided together."
            );
        }

        if (hasStart && !request.getEndTime().isAfter(request.getStartTime())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "End time must be after start time."
            );
        }
    }

    private boolean matchesSkills(
            SeekerProfile seeker,
            WorkerSearchRequest request
    ) {
        if (request.getSkillIds() == null
                || request.getSkillIds().isEmpty()) {
            return true;
        }

        return seekerSkillRepository
                .findBySeekerProfileId(seeker.getId())
                .stream()
                .anyMatch(seekerSkill ->
                        request.getSkillIds().contains(
                                seekerSkill.getSkill().getId()
                        )
                );
    }

    private boolean matchesLocation(
            SeekerProfile seeker,
            WorkerSearchRequest request
    ) {
        if (request.getLocation() == null
                || request.getLocation().isBlank()) {
            return true;
        }

        return seeker.getAddress() != null
                && seeker.getAddress().toLowerCase()
                .contains(request.getLocation().trim().toLowerCase());
    }

    private boolean matchesVerification(
            SeekerProfile seeker,
            WorkerSearchRequest request
    ) {
        if (request.getVerified() == null) {
            return true;
        }

        boolean verified =
                verificationRequestRepository.existsByUserIdAndTypeAndStatus(
                        seeker.getUser().getId(),
                        VerificationType.IDENTITY,
                        VerificationStatus.APPROVED
                );

        return verified == request.getVerified();
    }

    private boolean matchesRating(
            SeekerProfile seeker,
            WorkerSearchRequest request
    ) {
        if (request.getMinRating() == null) {
            return true;
        }

        List<Review> reviews = getWorkerReviews(seeker);

        if (reviews.isEmpty()) {
            return false;
        }

        double averageRating = reviews.stream()
                .mapToInt(Review::getRating)
                .average()
                .orElse(0);

        return averageRating >= request.getMinRating();
    }

    private boolean matchesEducation(
            SeekerProfile seeker,
            WorkerSearchRequest request
    ) {
        if (request.getEducation() == null
                || request.getEducation().isBlank()) {
            return true;
        }

        String search = request.getEducation().trim().toLowerCase();

        return qualificationRepository
                .findBySeekerProfileId(seeker.getId())
                .stream()
                .anyMatch(qualification ->
                        contains(qualification.getQualificationName(), search)
                                || contains(qualification.getFieldOfStudy(), search)
                                || contains(qualification.getInstitution(), search)
                );
    }

    private boolean matchesExperience(
            SeekerProfile seeker,
            WorkerSearchRequest request
    ) {
        if (request.getExperience() == null
                || request.getExperience().isBlank()) {
            return true;
        }

        String search = request.getExperience().trim().toLowerCase();

        return workExperienceRepository
                .findBySeekerProfileId(seeker.getId())
                .stream()
                .anyMatch(experience ->
                        contains(experience.getJobTitle(), search)
                                || contains(experience.getOrganizationName(), search)
                );
    }

    private boolean matchesMinimumExperience(
            SeekerProfile seeker,
            WorkerSearchRequest request
    ) {
        if (request.getMinExperienceYears() == null) {
            return true;
        }

        double years = calculateTotalExperienceYears(seeker);

        return years >= request.getMinExperienceYears();
    }

    private boolean matchesAvailability(
            SeekerProfile seeker,
            WorkerSearchRequest request
    ) {
        if (request.getAvailabilityDate() == null) {
            return true;
        }

        return seekerCalendarService.isAvailableForShift(
                seeker,
                request.getAvailabilityDate(),
                request.getStartTime(),
                request.getEndTime()
        );
    }

    private boolean contains(String value, String search) {
        return value != null
                && value.toLowerCase().contains(search);
    }

    private List<Review> getWorkerReviews(SeekerProfile seeker) {

        return reviewRepository
                .findByRevieweeIdOrderByCreatedAtDesc(
                        seeker.getUser().getId()
                )
                .stream()
                .filter(review ->
                        review.getDirection()
                                == ReviewDirection.PROVIDER_TO_WORKER
                )
                .toList();
    }

    private double calculateTotalExperienceYears(
            SeekerProfile seeker
    ) {

        List<WorkExperience> experiences =
                workExperienceRepository.findBySeekerProfileId(
                        seeker.getId()
                );

        if (experiences.isEmpty()) {
            return 0;
        }

        LocalDate today = LocalDate.now();

        List<LocalDate[]> periods = new ArrayList<>();

        for (WorkExperience experience : experiences) {

            LocalDate start = experience.getStartDate();

            if (start == null || start.isAfter(today)) {
                continue;
            }

            LocalDate end;

            if (experience.isCurrentlyWorking()) {
                end = today;
            } else {
                end = experience.getEndDate();
            }

            if (end == null || end.isBefore(start)) {
                continue;
            }

            if (end.isAfter(today)) {
                end = today;
            }

            periods.add(new LocalDate[]{start, end});
        }

        periods.sort(Comparator.comparing(period -> period[0]));

        long totalDays = 0;

        LocalDate currentStart = null;
        LocalDate currentEnd = null;

        for (LocalDate[] period : periods) {

            LocalDate start = period[0];
            LocalDate end = period[1];

            if (currentStart == null) {
                currentStart = start;
                currentEnd = end;
            } else if (!start.isAfter(currentEnd.plusDays(1))) {

                if (end.isAfter(currentEnd)) {
                    currentEnd = end;
                }

            } else {

                totalDays += ChronoUnit.DAYS.between(
                        currentStart,
                        currentEnd.plusDays(1)
                );

                currentStart = start;
                currentEnd = end;
            }
        }

        if (currentStart != null) {
            totalDays += ChronoUnit.DAYS.between(
                    currentStart,
                    currentEnd.plusDays(1)
            );
        }

        return totalDays / 365.25;
    }

    private WorkerSearchResponse mapToResponse(
            SeekerProfile seeker
    ) {

        List<String> skillNames =
                seekerSkillRepository
                        .findBySeekerProfileId(seeker.getId())
                        .stream()
                        .map(seekerSkill ->
                                seekerSkill.getSkill().getName()
                        )
                        .toList();

        List<String> qualifications =
                qualificationRepository
                        .findBySeekerProfileId(seeker.getId())
                        .stream()
                        .map(qualification ->
                                qualification.getQualificationName()
                                        + (qualification.getFieldOfStudy() != null
                                        ? " - " + qualification.getFieldOfStudy()
                                        : "")
                                        + (qualification.getInstitution() != null
                                        ? " (" + qualification.getInstitution() + ")"
                                        : "")
                        )
                        .toList();

        List<WorkExperience> experiences =
                workExperienceRepository.findBySeekerProfileId(
                        seeker.getId()
                );

        List<String> workExperiences = experiences.stream()
                .map(experience ->
                        experience.getJobTitle()
                                + (experience.getOrganizationName() != null
                                ? " - " + experience.getOrganizationName()
                                : "")
                )
                .toList();

        List<Review> reviews = getWorkerReviews(seeker);

        Double averageRating = reviews.isEmpty()
                ? null
                : reviews.stream()
                .mapToInt(Review::getRating)
                .average()
                .orElse(0);

        boolean verified =
                verificationRequestRepository.existsByUserIdAndTypeAndStatus(
                        seeker.getUser().getId(),
                        VerificationType.IDENTITY,
                        VerificationStatus.APPROVED
                );

        return new WorkerSearchResponse(
                seeker.getId(),
                seeker.getUser().getId(),
                seeker.getUser().getFullName(),
                seeker.getProfilePictureUrl(),
                seeker.getBio(),
                seeker.getAddress(),
                seeker.getPreferredTravelDistanceKm(),
                skillNames,
                qualifications,
                workExperiences,
                calculateTotalExperienceYears(seeker),
                verified,
                averageRating,
                reviews.size()
        );
    }
}
