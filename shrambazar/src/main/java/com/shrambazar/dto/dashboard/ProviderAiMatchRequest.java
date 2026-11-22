package com.shrambazar.dto.dashboard;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record ProviderAiMatchRequest(
        @NotBlank @Size(max = 2000) String message,
        Long jobId,
        @Size(max = 10) List<@Size(max = 2000) String> history
) {}
