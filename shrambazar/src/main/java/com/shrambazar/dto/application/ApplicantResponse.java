package com.shrambazar.dto.application;

import com.shrambazar.enums.ApplicationStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.math.BigDecimal;

public record ApplicantResponse(
        Long applicationId,
        Long seekerUserId,
        String seekerName,
        String profilePictureUrl,
        String bio,
        List<String> skills,
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
        List<String> applicationSkills,
        String experienceLevel,
        String introduction,
        boolean shortlisted
) {
}
