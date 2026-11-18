
package com.shrambazar.dto.profile;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public record QualificationRequest(

        @NotBlank
        @Size(max = 150)
        String qualificationName,

        @Size(max = 150)
        String institution,

        @Size(max = 150)
        String fieldOfStudy,

        @NotNull
        @PastOrPresent
        LocalDate startDate,

        LocalDate endDate,

        boolean currentlyStudying

) {
}
