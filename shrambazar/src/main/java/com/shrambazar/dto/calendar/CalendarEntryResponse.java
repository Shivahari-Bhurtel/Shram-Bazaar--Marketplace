
package com.shrambazar.dto.calendar;

import java.time.LocalDate;
import java.time.LocalTime;

public record CalendarEntryResponse(
        LocalDate date,
        LocalTime startTime,
        LocalTime endTime,
        String status,
        String jobTitle
) {
}
