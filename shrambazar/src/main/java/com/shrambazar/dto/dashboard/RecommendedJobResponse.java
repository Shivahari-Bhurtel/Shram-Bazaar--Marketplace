package com.shrambazar.dto.dashboard;

import com.shrambazar.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record RecommendedJobResponse(
        Long jobId,
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
        Integer numberOfWorkersRequired,
        List<String> requiredSkills,
        boolean saved
) {
}