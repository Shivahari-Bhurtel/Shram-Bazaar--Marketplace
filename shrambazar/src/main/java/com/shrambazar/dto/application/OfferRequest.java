package com.shrambazar.dto.application;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record OfferRequest(
        @NotNull @DecimalMin("0.01") @Digits(integer = 10, fraction = 2) BigDecimal offeredAmount,
        @NotBlank @Size(max = 1200) String message,
        @NotNull @Min(1) @Max(1000) Integer estimatedDurationHours,
        LocalDateTime proposedStartAt
) {}
