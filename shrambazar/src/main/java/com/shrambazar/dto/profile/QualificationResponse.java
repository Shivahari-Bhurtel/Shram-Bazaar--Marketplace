
package com.shrambazar.dto.profile;

import java.time.LocalDate;

public record QualificationResponse(
        Long id,
        String qualificationName,
        String institution,
        String fieldOfStudy,
        LocalDate startDate,
        LocalDate endDate,
        boolean currentlyStudying
) {
}
