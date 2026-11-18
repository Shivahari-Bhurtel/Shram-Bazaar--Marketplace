
package com.shrambazar.service.availability;

import com.shrambazar.dto.availability.*;
import com.shrambazar.entity.Availability;
import com.shrambazar.entity.SeekerProfile;
import com.shrambazar.repository.AvailabilityRepository;
import com.shrambazar.service.CurrentUserService;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@Service
public class AvailabilityService {

    private final AvailabilityRepository availabilityRepository;
    private final CurrentUserService currentUserService;

    public AvailabilityService(
            AvailabilityRepository availabilityRepository,
            CurrentUserService currentUserService) {

        this.availabilityRepository = availabilityRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<AvailabilityResponse> getMyAvailability() {

        SeekerProfile profile =
                currentUserService.getCurrentSeekerProfile();

        return availabilityRepository
                .findBySeekerProfileId(profile.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public AvailabilityResponse addAvailability(
            AvailabilityRequest request) {

        validateDates(request);

        SeekerProfile profile =
                currentUserService.getCurrentSeekerProfile();

        Availability availability = new Availability();

        availability.setSeekerProfile(profile);
        applyRequest(availability, request);
        availability.setActive(true);

        return mapToResponse(
                availabilityRepository.save(availability)
        );
    }

    @Transactional
    public AvailabilityResponse updateAvailability(
            Long id,
            AvailabilityRequest request) {

        validateDates(request);

        SeekerProfile profile =
                currentUserService.getCurrentSeekerProfile();

        Availability availability =
                availabilityRepository.findByIdAndSeekerProfileId(
                        id, profile.getId()
                ).orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Availability not found"
                        )
                );

        applyRequest(availability, request);

        return mapToResponse(availability);
    }

    @Transactional
    public AvailabilityResponse updateAvailabilityStatus(
            Long id,
            AvailabilityStatusRequest request) {

        SeekerProfile profile =
                currentUserService.getCurrentSeekerProfile();

        Availability availability =
                availabilityRepository.findByIdAndSeekerProfileId(
                        id, profile.getId()
                ).orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Availability not found"
                        )
                );

        availability.setActive(request.active());

        return mapToResponse(availability);
    }

    @Transactional
    public void deleteAvailability(Long id) {

        SeekerProfile profile =
                currentUserService.getCurrentSeekerProfile();

        Availability availability =
                availabilityRepository.findByIdAndSeekerProfileId(
                        id, profile.getId()
                ).orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Availability not found"
                        )
                );

        availabilityRepository.delete(availability);
    }

    private void validateDates(AvailabilityRequest request) {

        if (request.endDate() != null &&
                request.endDate().isBefore(request.startDate())) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "End date cannot be before start date"
            );
        }

        if (!request.endTime().isAfter(request.startTime())) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "End time must be after start time"
            );
        }

        // Weekly recurring availability must have a finite date range.
        if (request.dayOfWeek() != null && request.endDate() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "End date is required for recurring weekly availability"
            );
        }
    }

    private void applyRequest(
            Availability availability,
            AvailabilityRequest request) {

        availability.setDayOfWeek(request.dayOfWeek());
        availability.setStartDate(request.startDate());
        availability.setEndDate(request.endDate());
        availability.setStartTime(request.startTime());
        availability.setEndTime(request.endTime());
    }

    private AvailabilityResponse mapToResponse(
            Availability availability) {

        return new AvailabilityResponse(
                availability.getId(),
                availability.getDayOfWeek(),
                availability.getStartDate(),
                availability.getEndDate(),
                availability.getStartTime(),
                availability.getEndTime(),
                availability.isActive(),
                availability.getCreatedAt()
        );
    }
}
