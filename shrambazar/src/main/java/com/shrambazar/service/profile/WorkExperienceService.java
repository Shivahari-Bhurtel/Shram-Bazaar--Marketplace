
package com.shrambazar.service.profile;

import com.shrambazar.dto.profile.*;
import com.shrambazar.entity.*;
import com.shrambazar.repository.WorkExperienceRepository;
import com.shrambazar.service.CurrentUserService;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@Service
public class WorkExperienceService {

    private final WorkExperienceRepository workExperienceRepository;
    private final CurrentUserService currentUserService;

    public WorkExperienceService(
            WorkExperienceRepository workExperienceRepository,
            CurrentUserService currentUserService) {
        this.workExperienceRepository = workExperienceRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<WorkExperienceResponse> getMyExperience() {

        SeekerProfile profile =
                currentUserService.getCurrentSeekerProfile();

        return workExperienceRepository
                .findBySeekerProfileId(profile.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public WorkExperienceResponse addExperience(
            WorkExperienceRequest request) {

        validateDates(request.startDate(), request.endDate(),
                request.currentlyWorking());

        SeekerProfile profile =
                currentUserService.getCurrentSeekerProfile();

        WorkExperience experience = new WorkExperience();
        experience.setSeekerProfile(profile);

        applyRequest(experience, request);

        return mapToResponse(
                workExperienceRepository.save(experience)
        );
    }

    @Transactional
    public WorkExperienceResponse updateExperience(
            Long id, WorkExperienceRequest request) {

        validateDates(request.startDate(), request.endDate(),
                request.currentlyWorking());

        SeekerProfile profile =
                currentUserService.getCurrentSeekerProfile();

        WorkExperience experience =
                workExperienceRepository.findByIdAndSeekerProfileId(
                        id, profile.getId()
                ).orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Work experience not found"
                        )
                );

        applyRequest(experience, request);

        return mapToResponse(experience);
    }

    @Transactional
    public void deleteExperience(Long id) {

        SeekerProfile profile =
                currentUserService.getCurrentSeekerProfile();

        WorkExperience experience =
                workExperienceRepository.findByIdAndSeekerProfileId(
                        id, profile.getId()
                ).orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Work experience not found"
                        )
                );

        workExperienceRepository.delete(experience);
    }

    private void applyRequest(
            WorkExperience experience,
            WorkExperienceRequest request) {

        experience.setJobTitle(request.jobTitle().trim());
        experience.setOrganizationName(request.organizationName());
        experience.setDescription(request.description());
        experience.setStartDate(request.startDate());
        experience.setEndDate(request.endDate());
        experience.setCurrentlyWorking(request.currentlyWorking());
    }

    private void validateDates(
            LocalDate startDate,
            LocalDate endDate,
            boolean currentlyWorking) {

        if (currentlyWorking && endDate != null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "End date must be empty for current work"
            );
        }

        if (!currentlyWorking && endDate == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "End date is required for completed work"
            );
        }

        if (endDate != null && endDate.isBefore(startDate)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "End date cannot be before start date"
            );
        }
    }

    private WorkExperienceResponse mapToResponse(
            WorkExperience experience) {

        return new WorkExperienceResponse(
                experience.getId(),
                experience.getJobTitle(),
                experience.getOrganizationName(),
                experience.getDescription(),
                experience.getStartDate(),
                experience.getEndDate(),
                experience.isCurrentlyWorking()
        );
    }
}
