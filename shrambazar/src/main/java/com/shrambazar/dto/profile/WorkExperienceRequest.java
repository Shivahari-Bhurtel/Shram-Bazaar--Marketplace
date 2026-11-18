
package com.shrambazar.dto.profile;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public record WorkExperienceRequest(

        @NotBlank
        @Size(max = 150)
        String jobTitle,

        @Size(max = 150)
        String organizationName,

        @Size(max = 1000)
        String description,

        @NotNull
        @PastOrPresent
        LocalDate startDate,

        LocalDate endDate,

        boolean currentlyWorking

) {
}
