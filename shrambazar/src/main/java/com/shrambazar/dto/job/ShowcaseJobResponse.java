package com.shrambazar.dto.job;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Public response for a simulated listing in the worker discovery demo. */
public record ShowcaseJobResponse(
        String id,
        String title,
        String category,
        String company,
        String description,
        String location,
        String address,
        String city,
        Double latitude,
        Double longitude,
        @JsonProperty("salary_min") BigDecimal salaryMin,
        @JsonProperty("salary_max") BigDecimal salaryMax,
        @JsonProperty("salary_type") String salaryType,
        @JsonProperty("job_type") String jobType,
        String experience,
        List<String> skills,
        List<String> requirements,
        Integer vacancies,
        @JsonProperty("posted_date") LocalDate postedDate,
        LocalDate deadline,
        @JsonProperty("is_demo") boolean isDemo,
        String source,
        @JsonProperty("location_accuracy") String locationAccuracy
) {}
