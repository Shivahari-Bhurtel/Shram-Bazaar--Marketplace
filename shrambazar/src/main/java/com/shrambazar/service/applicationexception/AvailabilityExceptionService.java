
package com.shrambazar.service.applicationexception;

import com.shrambazar.dto.availabilityexception.AvailabilityExceptionRequest;
import com.shrambazar.dto.availabilityexception.AvailabilityExceptionResponse;
import com.shrambazar.entity.AvailabilityException;
import com.shrambazar.entity.SeekerProfile;
import com.shrambazar.repository.AvailabilityExceptionRepository;
import com.shrambazar.repository.SeekerProfileRepository;

import com.shrambazar.service.CurrentUserService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@Service
public class AvailabilityExceptionService {

    private final AvailabilityExceptionRepository exceptionRepository;
    private final SeekerProfileRepository seekerProfileRepository;
    private final CurrentUserService currentUserService;

    public AvailabilityExceptionService(
            AvailabilityExceptionRepository exceptionRepository,
            SeekerProfileRepository seekerProfileRepository,
            CurrentUserService currentUserService
    ) {
        this.exceptionRepository = exceptionRepository;
        this.seekerProfileRepository = seekerProfileRepository;
        this.currentUserService = currentUserService;
    }

    private SeekerProfile getCurrentSeekerProfile() {
        Long seekerProfileId = currentUserService
                .getCurrentSeekerProfile()
                .getId();

        return seekerProfileRepository.findById(seekerProfileId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Seeker profile not found"
                ));
    }

    @Transactional(readOnly = true)
    public List<AvailabilityExceptionResponse> getMyExceptions(
            LocalDate startDate,
            LocalDate endDate
    ) {
        SeekerProfile seeker = getCurrentSeekerProfile();

        if (startDate == null || endDate == null ||
                endDate.isBefore(startDate)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid date range"
            );
        }

        return exceptionRepository
                .findBySeekerProfileIdAndExceptionDateBetweenOrderByExceptionDateAscStartTimeAsc(
                        seeker.getId(), startDate, endDate
                )
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public AvailabilityExceptionResponse addException(
            AvailabilityExceptionRequest request
    ) {
        validateRequest(request);

        SeekerProfile seeker = getCurrentSeekerProfile();

        AvailabilityException exception = new AvailabilityException();

        exception.setSeekerProfile(seeker);
        applyRequest(exception, request);

        return mapToResponse(exceptionRepository.save(exception));
    }

    @Transactional
    public AvailabilityExceptionResponse updateException(
            Long id,
            AvailabilityExceptionRequest request
    ) {
        validateRequest(request);

        SeekerProfile seeker = getCurrentSeekerProfile();

        AvailabilityException exception = exceptionRepository
                .findByIdAndSeekerProfileId(id, seeker.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Availability exception not found"
                ));

        applyRequest(exception, request);

        return mapToResponse(exceptionRepository.save(exception));
    }

    @Transactional
    public void deleteException(Long id) {
        SeekerProfile seeker = getCurrentSeekerProfile();

        AvailabilityException exception = exceptionRepository
                .findByIdAndSeekerProfileId(id, seeker.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Availability exception not found"
                ));

        exceptionRepository.delete(exception);
    }

    private void validateRequest(AvailabilityExceptionRequest request) {
        if (request.startTime() == null ||
                request.endTime() == null ||
                !request.endTime().isAfter(request.startTime())) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "End time must be after start time"
            );
        }
    }

    private void applyRequest(
            AvailabilityException exception,
            AvailabilityExceptionRequest request
    ) {
        exception.setExceptionDate(request.exceptionDate());
        exception.setStartTime(request.startTime());
        exception.setEndTime(request.endTime());
    }

    private AvailabilityExceptionResponse mapToResponse(
            AvailabilityException exception
    ) {
        return new AvailabilityExceptionResponse(
                exception.getId(),
                exception.getExceptionDate(),
                exception.getStartTime(),
                exception.getEndTime(),
                exception.getCreatedAt()
        );
    }
}
