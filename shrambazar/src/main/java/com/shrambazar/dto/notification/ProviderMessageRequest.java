package com.shrambazar.dto.notification;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProviderMessageRequest(
        @NotBlank @Size(max = 1000) String message
) {
}
