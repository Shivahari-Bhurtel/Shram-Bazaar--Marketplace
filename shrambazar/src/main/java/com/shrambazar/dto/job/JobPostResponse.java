
package com.shrambazar.dto.job;

import com.shrambazar.enums.JobPostStatus;
import com.shrambazar.enums.PaymentMethod;
import com.shrambazar.enums.PaymentPeriod;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public record JobPostResponse(

        Long id,
        String providerName,
        String businessName,

        String title,
        String category,
        String qualificationRequired,
        String description,
        String responsibilities,

        String address,
        String municipality,
        String district,
        String province,
        Double latitude,
        Double longitude,

        LocalDate startDate,
        LocalDate endDate,
        LocalTime startTime,
        LocalTime endTime,
        String durationDescription,

        BigDecimal paymentAmount,
        BigDecimal paymentMaxAmount,
        boolean budgetNegotiable,
        PaymentPeriod paymentPeriod,
        PaymentMethod paymentMethod,

        Integer requiredExperienceMonths,
        Integer numberOfWorkersRequired,

        List<String> requiredSkills,

        long applicationCount,

        JobPostStatus status,
        LocalDateTime createdAt,
        LocalDateTime publishedAt

) {
}
