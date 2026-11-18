
package com.shrambazar.dto.job;

import com.shrambazar.enums.JobPostStatus;
import com.shrambazar.enums.PaymentMethod;

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
        String description,
        String responsibilities,

        String address,
        String municipality,
        String district,
        String province,

        LocalDate startDate,
        LocalDate endDate,
        LocalTime startTime,
        LocalTime endTime,
        String durationDescription,

        BigDecimal paymentAmount,
        PaymentMethod paymentMethod,

        Integer requiredExperienceMonths,
        Integer numberOfWorkersRequired,

        List<String> requiredSkills,

        JobPostStatus status,
        LocalDateTime createdAt,
        LocalDateTime publishedAt

) {
}
