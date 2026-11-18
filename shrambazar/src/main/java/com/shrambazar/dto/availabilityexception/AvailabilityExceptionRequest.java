
package com.shrambazar.dto.availabilityexception;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

public record AvailabilityExceptionRequest(

        @NotNull
        @FutureOrPresent
        LocalDate exceptionDate,

        @NotNull
        LocalTime startTime,

        @NotNull
        LocalTime endTime

) {
}
