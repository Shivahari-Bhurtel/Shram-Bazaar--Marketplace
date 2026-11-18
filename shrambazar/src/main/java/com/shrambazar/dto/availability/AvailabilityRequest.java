
package com.shrambazar.dto.availability;

import jakarta.validation.constraints.*;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;

public record AvailabilityRequest(

        DayOfWeek dayOfWeek,

        @NotNull
        @FutureOrPresent
        LocalDate startDate,

        @FutureOrPresent
        LocalDate endDate,

        @NotNull
        LocalTime startTime,

        @NotNull
        LocalTime endTime

) {
}
