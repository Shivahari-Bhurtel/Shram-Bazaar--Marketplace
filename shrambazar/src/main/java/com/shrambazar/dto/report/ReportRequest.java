package com.shrambazar.dto.report;

import com.shrambazar.enums.ReportReason;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record ReportRequest(

        @Positive
        Long reportedUserId,

        @Positive
        Long reportedJobPostId,

        @NotNull
        ReportReason reason,

        @NotBlank
        @Size(max = 2000)
        String description

) {
}