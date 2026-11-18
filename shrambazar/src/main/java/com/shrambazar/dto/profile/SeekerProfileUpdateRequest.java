
package com.shrambazar.dto.profile;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public record SeekerProfileUpdateRequest(

        @NotBlank
        @Size(max = 100)
        String fullName,

        @NotBlank
        @Pattern(regexp = "^\\+?[0-9]{7,15}$")
        String phoneNumber,

        @NotNull
        @Past
        LocalDate dateOfBirth,

        @NotBlank
        @Size(max = 255)
        String address,

        @Size(max = 1000)
        String bio,

        @PositiveOrZero
        @Max(500)
        Integer preferredTravelDistanceKm

) {
}
