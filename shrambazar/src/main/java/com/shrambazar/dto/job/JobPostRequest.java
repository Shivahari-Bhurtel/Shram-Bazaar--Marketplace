
package com.shrambazar.dto.job;

import com.shrambazar.enums.PaymentMethod;
import com.shrambazar.enums.PaymentPeriod;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record JobPostRequest(

        @NotBlank
        @Size(max = 150)
        String title,

        @NotBlank @Size(max = 80)
        String category,

        @Size(max = 255)
        String qualificationRequired,

        @NotBlank
        String description,

        String responsibilities,

        @NotBlank
        @Size(max = 255)
        String address,

        String municipality,
        String district,
        String province,

        @DecimalMin("-90.0") @DecimalMax("90.0")
        Double latitude,

        @DecimalMin("-180.0") @DecimalMax("180.0")
        Double longitude,

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

        @DecimalMin("0.01")
        BigDecimal paymentAmount,

        @DecimalMin("0.01")
        BigDecimal paymentMaxAmount,

        Boolean budgetNegotiable,

        PaymentPeriod paymentPeriod,

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
