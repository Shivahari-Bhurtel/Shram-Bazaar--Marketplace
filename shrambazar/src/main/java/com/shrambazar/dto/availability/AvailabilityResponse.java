
package com.shrambazar.dto.availability;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public record AvailabilityResponse(

        Long id,
        DayOfWeek dayOfWeek,
        LocalDate startDate,
        LocalDate endDate,
        LocalTime startTime,
        LocalTime endTime,
        boolean active,
        LocalDateTime createdAt,
        Long serviceListingId

) {
}
