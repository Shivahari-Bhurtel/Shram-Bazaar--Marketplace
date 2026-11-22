package com.shrambazar.dto.application;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record OfferRequest(
        @DecimalMin("0.01") @Digits(integer = 10, fraction = 2) BigDecimal offeredAmount,
        @Size(max = 1200) String message,
        @Min(1) @Max(1000) Integer estimatedDurationHours,
        LocalDateTime proposedStartAt,
        @Size(max = 120) String applicantName,
        @Email @Size(max = 254) String applicantEmail,
        @Size(max = 32) String applicantPhone,
        @Size(max = 255) String applicantLocation,
        @Size(max = 20) List<@NotBlank @Size(max = 80) String> skills,
        @Pattern(regexp = "No Experience|Beginner|Experienced") String experienceLevel,
        @Size(max = 1200) String introduction
) {}
