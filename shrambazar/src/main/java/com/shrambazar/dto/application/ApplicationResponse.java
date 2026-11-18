package com.shrambazar.dto.application;

import com.shrambazar.enums.ApplicationStatus;
import com.shrambazar.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record ApplicationResponse(
        Long applicationId,
        Long jobId,
        String jobTitle,
        String jobAddress,
        String district,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal paymentAmount,
        PaymentMethod paymentMethod,
        ApplicationStatus status,
        LocalDateTime appliedAt
) {
}