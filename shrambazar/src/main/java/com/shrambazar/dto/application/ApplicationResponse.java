package com.shrambazar.dto.application;

import com.shrambazar.enums.ApplicationStatus;
import com.shrambazar.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

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
        LocalDateTime appliedAt,
        BigDecimal offeredAmount,
        String offerMessage,
        Integer estimatedDurationHours,
        LocalDateTime proposedStartAt,
        String applicantName,
        String applicantEmail,
        String applicantPhone,
        String applicantLocation,
        List<String> skills,
        String experienceLevel,
        String introduction,
        boolean confirmationEmailSent,
        boolean shortlisted
) {
}
