package com.shrambazar.dto.report;

import com.shrambazar.enums.ReportReason;
import com.shrambazar.enums.ReportStatus;

import java.time.LocalDateTime;

public record ReportResponse(

        Long id,
        Long reportedUserId,
        Long reportedJobPostId,
        ReportReason reason,
        String description,
        ReportStatus status,
        LocalDateTime createdAt,
        LocalDateTime resolvedAt

) {
}