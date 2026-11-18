
package com.shrambazar.service.calendar;

import com.shrambazar.dto.calendar.CalendarEntryResponse;
import com.shrambazar.entity.*;
import com.shrambazar.enums.EngagementStatus;
import com.shrambazar.repository.AvailabilityExceptionRepository;
import com.shrambazar.repository.AvailabilityRepository;
import com.shrambazar.repository.WorkerEngagementRepository;

import com.shrambazar.service.CurrentUserService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class SeekerCalendarService {

    private final AvailabilityRepository availabilityRepository;
    private final AvailabilityExceptionRepository exceptionRepository;
    private final WorkerEngagementRepository engagementRepository;
    private final CurrentUserService currentUserService;

    public SeekerCalendarService(
            AvailabilityRepository availabilityRepository,
            AvailabilityExceptionRepository exceptionRepository,
            WorkerEngagementRepository engagementRepository,
            CurrentUserService currentUserService
    ) {
        this.availabilityRepository = availabilityRepository;
        this.exceptionRepository = exceptionRepository;
        this.engagementRepository = engagementRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<CalendarEntryResponse> getMyCalendar(
            LocalDate startDate,
            LocalDate endDate
    ) {
        if (startDate == null || endDate == null ||
                endDate.isBefore(startDate)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid calendar date range"
            );
        }

        if (startDate.plusDays(366).isBefore(endDate)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Calendar range cannot exceed one year"
            );
        }

        Long seekerProfileId = currentUserService
                .getCurrentSeekerProfile()
                .getId();

        List<Availability> availabilities =
                availabilityRepository
                        .findBySeekerProfileIdAndActiveTrueOrderByStartDateAscStartTimeAsc(
                                seekerProfileId
                        );

        List<AvailabilityException> exceptions =
                exceptionRepository
                        .findBySeekerProfileIdAndExceptionDateBetweenOrderByExceptionDateAscStartTimeAsc(
                                seekerProfileId,
                                startDate,
                                endDate
                        );

        List<WorkerEngagement> engagements =
                engagementRepository.findSeekerProfileById(seekerProfileId);

        List<CalendarEntryResponse> calendar = new ArrayList<>();

        LocalDate currentDate = startDate;

        while (!currentDate.isAfter(endDate)) {

            LocalDate date = currentDate;

            List<TimeSlot> availableSlots = new ArrayList<>();
            List<TimeSlot> blockedSlots = new ArrayList<>();

            // 1. Find availability for this date
            for (Availability availability : availabilities) {

                boolean dateMatches =
                        !date.isBefore(availability.getStartDate()) &&
                                (availability.getEndDate() == null ||
                                        !date.isAfter(availability.getEndDate()));

                boolean dayMatches =
                        availability.getDayOfWeek() == null ||
                                availability.getDayOfWeek() == date.getDayOfWeek();

                if (dateMatches && dayMatches) {
                    availableSlots.add(new TimeSlot(
                            availability.getStartTime(),
                            availability.getEndTime()
                    ));
                }
            }

            // 2. Add unavailable exceptions
            for (AvailabilityException exception : exceptions) {

                if (exception.getExceptionDate().equals(date)) {

                    TimeSlot slot = new TimeSlot(
                            exception.getStartTime(),
                            exception.getEndTime()
                    );

                    blockedSlots.add(slot);

                    calendar.add(new CalendarEntryResponse(
                            date,
                            slot.start(),
                            slot.end(),
                            "UNAVAILABLE",
                            null
                    ));
                }
            }

            // 3. Add confirmed and in-progress engagements
            for (WorkerEngagement engagement : engagements) {

                EngagementStatus status = engagement.getStatus();

                if (status != EngagementStatus.CONFIRMED &&
                        status != EngagementStatus.IN_PROGRESS) {
                    continue;
                }

                JobPost job = engagement.getApplication().getJobPost();

                // Every date in the job's date range is a working day
                if (date.isBefore(job.getStartDate()) ||
                        date.isAfter(job.getEndDate())) {
                    continue;
                }

                TimeSlot occupiedSlot = new TimeSlot(
                        job.getStartTime(),
                        job.getEndTime()
                );

                blockedSlots.add(occupiedSlot);

                calendar.add(new CalendarEntryResponse(
                        date,
                        occupiedSlot.start(),
                        occupiedSlot.end(),
                        "OCCUPIED",
                        job.getTitle()
                ));
            }

            // 4. Remove occupied and unavailable periods
            // from the available time slots
            for (TimeSlot blocked : blockedSlots) {

                List<TimeSlot> remainingSlots = new ArrayList<>();

                for (TimeSlot available : availableSlots) {
                    remainingSlots.addAll(
                            subtract(available, blocked)
                    );
                }

                availableSlots = remainingSlots;
            }

            // 5. Add the remaining available periods
            for (TimeSlot slot : availableSlots) {

                calendar.add(new CalendarEntryResponse(
                        date,
                        slot.start(),
                        slot.end(),
                        "AVAILABLE",
                        null
                ));
            }

            currentDate = currentDate.plusDays(1);
        }

        // Sort calendar entries by date and start time
        calendar.sort(
                Comparator.comparing(CalendarEntryResponse::date)
                        .thenComparing(CalendarEntryResponse::startTime)
        );

        return calendar;
    }

    // Removes an overlapping blocked period from an available period
    private List<TimeSlot> subtract(
            TimeSlot available,
            TimeSlot blocked
    ) {
        List<TimeSlot> result = new ArrayList<>();

        // No overlap
        if (!blocked.start().isBefore(available.end()) ||
                !blocked.end().isAfter(available.start())) {

            result.add(available);
            return result;
        }

        // Available time before the blocked period
        if (blocked.start().isAfter(available.start())) {
            result.add(new TimeSlot(
                    available.start(),
                    blocked.start()
            ));
        }

        // Available time after the blocked period
        if (blocked.end().isBefore(available.end())) {
            result.add(new TimeSlot(
                    blocked.end(),
                    available.end()
            ));
        }

        return result;
    }

    private record TimeSlot(
            LocalTime start,
            LocalTime end
    ) {
    }


    @Transactional(readOnly = true)
    public void validateJobAvailability(
            SeekerProfile seeker,
            JobPost job
    ) {
        Long seekerProfileId = seeker.getId();

        LocalDate startDate = job.getStartDate();
        LocalDate endDate = job.getEndDate();

        if (startDate == null || endDate == null ||
                endDate.isBefore(startDate)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid job schedule"
            );
        }

        // Load the seeker's active availability
        List<Availability> availabilities =
                availabilityRepository
                        .findBySeekerProfileIdAndActiveTrueOrderByStartDateAscStartTimeAsc(
                                seekerProfileId
                        );

        // Load unavailable exceptions within the job date range
        List<AvailabilityException> exceptions =
                exceptionRepository
                        .findBySeekerProfileIdAndExceptionDateBetweenOrderByExceptionDateAscStartTimeAsc(
                                seekerProfileId,
                                startDate,
                                endDate
                        );

        // Load the seeker's existing engagements
        List<WorkerEngagement> engagements =
                engagementRepository.findSeekerProfileById(seekerProfileId);

        LocalDate date = startDate;

        while (!date.isAfter(endDate)) {

            // 1. Find availability slots matching this date
            List<TimeSlot> matchingSlots = new ArrayList<>();

            for (Availability availability : availabilities) {

                boolean dateMatches =
                        !date.isBefore(availability.getStartDate()) &&
                                (availability.getEndDate() == null ||
                                        !date.isAfter(availability.getEndDate()));

                boolean dayMatches =
                        availability.getDayOfWeek() == null ||
                                availability.getDayOfWeek() == date.getDayOfWeek();

                if (dateMatches && dayMatches) {
                    matchingSlots.add(new TimeSlot(
                            availability.getStartTime(),
                            availability.getEndTime()
                    ));
                }
            }

            // 2. Check whether availability covers the entire job shift
            if (!isFullyCovered(
                    job.getStartTime(),
                    job.getEndTime(),
                    matchingSlots
            )) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "You are not available for the entire job schedule on "
                                + date
                );
            }

            // 3. Check unavailable exceptions
            for (AvailabilityException exception : exceptions) {

                if (exception.getExceptionDate().equals(date) &&
                        hasOverlap(
                                job.getStartTime(),
                                job.getEndTime(),
                                exception.getStartTime(),
                                exception.getEndTime()
                        )) {

                    throw new ResponseStatusException(
                            HttpStatus.CONFLICT,
                            "You have marked yourself unavailable on " + date
                    );
                }
            }

            // 4. Check existing confirmed/in-progress engagements
            for (WorkerEngagement existing : engagements) {

                if (existing.getStatus() != EngagementStatus.CONFIRMED &&
                        existing.getStatus() != EngagementStatus.IN_PROGRESS) {
                    continue;
                }

                JobPost existingJob =
                        existing.getApplication().getJobPost();

                boolean dateOverlap =
                        !date.isBefore(existingJob.getStartDate()) &&
                                !date.isAfter(existingJob.getEndDate());

                boolean timeOverlap = hasOverlap(
                        job.getStartTime(),
                        job.getEndTime(),
                        existingJob.getStartTime(),
                        existingJob.getEndTime()
                );

                if (dateOverlap && timeOverlap) {
                    throw new ResponseStatusException(
                            HttpStatus.CONFLICT,
                            "You already have another job during this time on "
                                    + date
                    );
                }
            }

            date = date.plusDays(1);
        }
    }

    // Checks whether multiple availability slots collectively
// cover the entire required job shift.
    private boolean isFullyCovered(
            LocalTime requiredStart,
            LocalTime requiredEnd,
            List<TimeSlot> slots
    ) {
        slots.sort(Comparator.comparing(TimeSlot::start));

        LocalTime coveredUntil = requiredStart;

        for (TimeSlot slot : slots) {

            // Ignore slots that end before current coverage
            if (!slot.end().isAfter(coveredUntil)) {
                continue;
            }

            // A gap means the entire shift is not covered
            if (slot.start().isAfter(coveredUntil)) {
                return false;
            }

            if (slot.end().isAfter(coveredUntil)) {
                coveredUntil = slot.end();
            }

            if (!coveredUntil.isBefore(requiredEnd)) {
                return true;
            }
        }

        return false;
    }

    // Checks whether two time periods overlap
    private boolean hasOverlap(
            LocalTime startA,
            LocalTime endA,
            LocalTime startB,
            LocalTime endB
    ) {
        return startA.isBefore(endB) &&
                endA.isAfter(startB);
    }

    @Transactional(readOnly = true)
    public boolean isAvailableForJob(SeekerProfile seeker, JobPost job) {
        try {
            validateJobAvailability(seeker, job);
            return true;
        } catch (ResponseStatusException ex) {
            return false;
        }
    }

    @Transactional(readOnly = true)
    public boolean isAvailableForShift(
            SeekerProfile seeker,
            LocalDate date,
            LocalTime startTime,
            LocalTime endTime
    ) {
        if (date == null || startTime == null || endTime == null
                || !endTime.isAfter(startTime)) {
            return false;
        }

        Long seekerProfileId = seeker.getId();

        List<Availability> availabilities =
                availabilityRepository
                        .findBySeekerProfileIdAndActiveTrueOrderByStartDateAscStartTimeAsc(
                                seekerProfileId
                        );

        List<AvailabilityException> exceptions =
                exceptionRepository
                        .findBySeekerProfileIdAndExceptionDateBetweenOrderByExceptionDateAscStartTimeAsc(
                                seekerProfileId,
                                date,
                                date
                        );

        List<WorkerEngagement> engagements =
                engagementRepository.findSeekerProfileById(seekerProfileId);

        List<TimeSlot> matchingSlots = new ArrayList<>();

        // 1. Find availability slots for the requested date.
        for (Availability availability : availabilities) {

            boolean dateMatches =
                    !date.isBefore(availability.getStartDate())
                            && (availability.getEndDate() == null
                            || !date.isAfter(availability.getEndDate()));

            boolean dayMatches =
                    availability.getDayOfWeek() == null
                            || availability.getDayOfWeek() == date.getDayOfWeek();

            if (dateMatches && dayMatches) {
                matchingSlots.add(new TimeSlot(
                        availability.getStartTime(),
                        availability.getEndTime()
                ));
            }
        }

        // 2. Ensure the availability covers the entire shift.
        if (!isFullyCovered(startTime, endTime, matchingSlots)) {
            return false;
        }

        // 3. Check unavailable exceptions.
        for (AvailabilityException exception : exceptions) {

            if (exception.getExceptionDate().equals(date)
                    && hasOverlap(
                    startTime,
                    endTime,
                    exception.getStartTime(),
                    exception.getEndTime()
            )) {
                return false;
            }
        }

        // 4. Check existing confirmed and in-progress engagements.
        for (WorkerEngagement engagement : engagements) {

            if (engagement.getStatus() != EngagementStatus.CONFIRMED
                    && engagement.getStatus() != EngagementStatus.IN_PROGRESS) {
                continue;
            }

            JobPost existingJob =
                    engagement.getApplication().getJobPost();

            boolean dateOverlap =
                    !date.isBefore(existingJob.getStartDate())
                            && !date.isAfter(existingJob.getEndDate());

            if (dateOverlap && hasOverlap(
                    startTime,
                    endTime,
                    existingJob.getStartTime(),
                    existingJob.getEndTime()
            )) {
                return false;
            }
        }

        return true;
    }

}
