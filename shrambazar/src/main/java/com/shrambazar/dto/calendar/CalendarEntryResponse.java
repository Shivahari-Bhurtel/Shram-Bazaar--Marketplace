
package com.shrambazar.dto.calendar;

import java.time.LocalDate;
import java.time.LocalTime;

public record CalendarEntryResponse(
        LocalDate date,
        LocalTime startTime,
        LocalTime endTime,
        String status,
        String jobTitle,
        Long availabilityId,
        Long serviceListingId,
        String serviceTitle
) {
    public CalendarEntryResponse(LocalDate date, LocalTime startTime, LocalTime endTime, String status, String jobTitle) {
        this(date, startTime, endTime, status, jobTitle, null, null, null);
    }
}
