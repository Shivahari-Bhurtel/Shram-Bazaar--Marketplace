package com.shrambazar.dto.report;

import com.shrambazar.enums.ModerationActionType;

import java.time.LocalDateTime;

public record ModerationActionResponse(

        Long id,
        Long adminId,
        String adminName,
        ModerationActionType actionType,
        String reason,
        LocalDateTime createdAt

) {
}