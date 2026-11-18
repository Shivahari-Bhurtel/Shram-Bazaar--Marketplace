package com.shrambazar.dto.report;

import com.shrambazar.enums.ReportReason;
import com.shrambazar.enums.ReportStatus;

import java.time.LocalDateTime;
import java.util.List;

public record AdminReportResponse(

        Long id,

        Long reporterId,
        String reporterName,
        String reporterEmail,

        Long reportedUserId,
        String reportedUserName,
        String reportedUserEmail,

        Long reportedJobPostId,
        String reportedJobTitle,

        ReportReason reason,
        String description,
        ReportStatus status,

        LocalDateTime createdAt,
        LocalDateTime resolvedAt,

        List<ModerationActionResponse> actions

) {
}