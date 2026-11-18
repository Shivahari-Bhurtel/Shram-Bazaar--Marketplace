
package com.shrambazar.dto.profile;

import java.time.LocalDate;

public record WorkExperienceResponse(
        Long id,
        String jobTitle,
        String organizationName,
        String description,
        LocalDate startDate,
        LocalDate endDate,
        boolean currentlyWorking
) {
}
