
package com.shrambazar.dto.engagement;

import com.shrambazar.enums.EngagementStatus;

import java.time.LocalDateTime;

public record WorkerEngagementResponse(

        Long engagementId,
        Long applicationId,
        Long jobId,
        String jobTitle,
        String providerName,
        String workerName,

        EngagementStatus status,

        boolean providerCompletionConfirmed,
        boolean seekerCompletionConfirmed,

        LocalDateTime selectedAt,
        LocalDateTime respondedAt,
        LocalDateTime startedAt,
        LocalDateTime completedAt

) {
}
