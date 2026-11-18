package com.shrambazar.dto.application;

import com.shrambazar.enums.ApplicationStatus;
import java.time.LocalDateTime;
import java.util.List;

public record ApplicantResponse(
        Long applicationId,
        Long seekerUserId,
        String seekerName,
        String profilePictureUrl,
        String bio,
        List<String> skills,
        ApplicationStatus status,
        LocalDateTime appliedAt
) {
}