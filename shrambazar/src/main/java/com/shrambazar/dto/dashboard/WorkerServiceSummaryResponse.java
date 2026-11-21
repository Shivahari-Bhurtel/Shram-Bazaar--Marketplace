package com.shrambazar.dto.dashboard;

import com.shrambazar.entity.WorkerServiceListing.PricingType;
import java.math.BigDecimal;
import java.util.List;

public record WorkerServiceSummaryResponse(Long id, String category, String title, String description,
                                           BigDecimal price, PricingType pricingType,
                                           Integer minimumDurationHours, String serviceArea,
                                           boolean negotiable,
                                           List<ServiceAvailabilitySummaryResponse> availability) {}
