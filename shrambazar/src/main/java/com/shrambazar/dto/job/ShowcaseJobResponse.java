package com.shrambazar.dto.job;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record ShowcaseJobResponse(
        Long id,
        String title,
        String company,
        String location,
        String country,
        String salaryText,
        BigDecimal salaryMin,
        BigDecimal salaryMax,
        String salaryCurrency,
        String category,
        LocalDate deadline,
        String experience,
        List<String> skills,
        String jobLevel,
        List<String> jobTypes,
        Integer vacancies,
        LocalDate postedDate,
        String source,
        String sourceUrl,
        LocalDate scrapedAt,
        String availabilityStatus,
        String mapArea,
        Double mapLatitude,
        Double mapLongitude
) {}
