package com.shrambazar.dto.service;

import com.shrambazar.entity.WorkerServiceListing.PricingType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record WorkerServiceResponse(
        Long id, Long seekerProfileId, String category, String title, String description,
        List<String> skills, PricingType pricingType, BigDecimal price,
        Integer minimumDurationHours, String serviceArea, boolean active, boolean negotiable,
        LocalDateTime createdAt, LocalDateTime updatedAt
) {}
