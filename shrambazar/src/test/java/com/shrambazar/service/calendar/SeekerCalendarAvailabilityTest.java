package com.shrambazar.service.calendar;

import com.shrambazar.entity.Availability;
import com.shrambazar.entity.SeekerProfile;
import com.shrambazar.repository.AvailabilityExceptionRepository;
import com.shrambazar.repository.AvailabilityRepository;
import com.shrambazar.repository.WorkerEngagementRepository;
import com.shrambazar.service.CurrentUserService;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SeekerCalendarAvailabilityTest {
    @Test
    void dateSpecificHoursReplaceTheWeeklyScheduleForThatDate() {
        AvailabilityRepository availabilityRepository = mock(AvailabilityRepository.class);
        AvailabilityExceptionRepository exceptionRepository = mock(AvailabilityExceptionRepository.class);
        WorkerEngagementRepository engagementRepository = mock(WorkerEngagementRepository.class);
        CurrentUserService currentUserService = mock(CurrentUserService.class);
        SeekerCalendarService service = new SeekerCalendarService(
                availabilityRepository, exceptionRepository, engagementRepository, currentUserService);

        SeekerProfile worker = new SeekerProfile();
        worker.setId(72L);
        LocalDate date = LocalDate.of(2026, 11, 23);

        Availability weekly = new Availability();
        weekly.setDayOfWeek(DayOfWeek.MONDAY);
        weekly.setStartDate(LocalDate.of(2026, 1, 1));
        weekly.setEndDate(LocalDate.of(2026, 12, 31));
        weekly.setStartTime(LocalTime.of(8, 0));
        weekly.setEndTime(LocalTime.of(17, 0));

        Availability override = new Availability();
        override.setDayOfWeek(null);
        override.setStartDate(date);
        override.setEndDate(date);
        override.setStartTime(LocalTime.of(10, 0));
        override.setEndTime(LocalTime.of(12, 0));

        when(availabilityRepository.findBySeekerProfileIdAndActiveTrueOrderByStartDateAscStartTimeAsc(72L))
                .thenReturn(List.of(weekly, override));
        when(exceptionRepository.findBySeekerProfileIdAndExceptionDateBetweenOrderByExceptionDateAscStartTimeAsc(72L, date, date))
                .thenReturn(List.of());
        when(engagementRepository.findByApplicationSeekerProfileId(72L)).thenReturn(List.of());

        assertTrue(service.isAvailableForShift(worker, date, LocalTime.of(10, 0), LocalTime.of(11, 0)));
        assertFalse(service.isAvailableForShift(worker, date, LocalTime.of(8, 0), LocalTime.of(9, 0)));
    }
}
