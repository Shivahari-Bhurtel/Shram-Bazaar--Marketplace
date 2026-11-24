
package com.shrambazar.dto.profile;

import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;

public record SeekerProfileUpdateRequest(

        @NotBlank
        @Size(max = 100)
        String fullName,

        @NotBlank
        @Pattern(regexp = "^\\+?[0-9]{7,15}$")
        String phoneNumber,

        @Past
        LocalDate dateOfBirth,

        @NotBlank
        @Size(max = 255)
        String address,

        @Size(max = 1000)
        String bio,

        @PositiveOrZero
        @Max(500)
        Integer preferredTravelDistanceKm,

        @DecimalMin("-90.0") @DecimalMax("90.0")
        Double latitude,

        @DecimalMin("-180.0") @DecimalMax("180.0")
        Double longitude,

        @Size(max = 30)
        List<@NotBlank @Size(max = 80) String> preferredCategories,

        @Size(max = 30)
        List<@NotBlank @Size(max = 80) String> languages,

        @Size(max = 30)
        List<@NotBlank @Size(max = 160) String> certifications,

        Boolean acceptingWork,
        @Email @Size(max = 254) String contactEmail,
        @Size(max = 160) String preferredWorkLocation,
        @Size(max = 120) String availableStart,
        @Size(max = 255) String referenceNote,
        Boolean weekendsAvailable,
        @Size(max = 30) List<@NotBlank @Size(max = 80) String> employmentPreferences,
        @Size(max = 30) List<@NotBlank @Size(max = 80) String> preferredShifts

) {
}
