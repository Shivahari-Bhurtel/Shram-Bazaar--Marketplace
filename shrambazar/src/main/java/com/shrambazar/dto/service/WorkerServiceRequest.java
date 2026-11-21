package com.shrambazar.dto.service;

import com.shrambazar.entity.WorkerServiceListing.PricingType;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

public record WorkerServiceRequest(
        @NotBlank @Size(max = 100) String category,
        @NotBlank @Size(max = 140) String title,
        @NotBlank @Size(max = 3000) String description,
        @Size(max = 12) List<@Size(max = 80) String> skills,
        @NotNull PricingType pricingType,
        @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal price,
        @Min(1) @Max(1000) Integer minimumDurationHours,
        @Size(max = 160) String serviceArea,
        boolean active,
        Boolean negotiable
) {}
