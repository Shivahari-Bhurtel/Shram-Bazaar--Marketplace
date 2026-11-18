
package com.shrambazar.dto.job;

import com.shrambazar.enums.PaymentMethod;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record JobPostRequest(

        @NotBlank
        @Size(max = 150)
        String title,

        @NotBlank
        String description,

        String responsibilities,

        @NotBlank
        @Size(max = 255)
        String address,

        String municipality,
        String district,
        String province,

        @NotNull
        @FutureOrPresent
        LocalDate startDate,

        @NotNull
        LocalDate endDate,

        @NotNull
        LocalTime startTime,

        @NotNull
        LocalTime endTime,

        String durationDescription,

        @NotNull
        @DecimalMin("0.01")
        BigDecimal paymentAmount,

        @NotNull
        PaymentMethod paymentMethod,

        @PositiveOrZero
        Integer requiredExperienceMonths,

        @NotNull
        @Min(1)
        Integer numberOfWorkersRequired,

        List<@NotNull @Positive Long> requiredSkillIds

) {
}
