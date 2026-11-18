
package com.shrambazar.dto.availabilityexception;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public record AvailabilityExceptionResponse(
        Long id,
        LocalDate exceptionDate,
        LocalTime startTime,
        LocalTime endTime,
        LocalDateTime createdAt
) {
}
