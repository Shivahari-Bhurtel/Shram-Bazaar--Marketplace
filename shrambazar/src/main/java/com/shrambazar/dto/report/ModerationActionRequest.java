package com.shrambazar.dto.report;

import com.shrambazar.enums.ModerationActionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ModerationActionRequest(

        @NotNull
        ModerationActionType actionType,

        @NotBlank
        @Size(max = 1000)
        String reason

) {
}