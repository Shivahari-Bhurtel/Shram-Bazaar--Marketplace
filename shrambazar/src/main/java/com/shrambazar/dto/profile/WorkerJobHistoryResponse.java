package com.shrambazar.dto.profile;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record WorkerJobHistoryResponse(

        Long engagementId,
        Long jobPostId,
        String jobTitle,
        String jobDescription,
        String location,
        LocalDate startDate,
        LocalDate endDate,
        LocalDateTime completedAt,
        Integer rating,
        String review,
        LocalDateTime reviewedAt

) {
}