package com.shrambazar.dto.dashboard;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;

public record ServiceAvailabilitySummaryResponse(
        Long availabilityId,
        DayOfWeek dayOfWeek,
        LocalDate startDate,
        LocalDate endDate,
        LocalTime startTime,
        LocalTime endTime
) {}
