
package com.shrambazar.dto.profile;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public record ProviderProfileUpdateRequest(

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

        @Size(max = 150)
        String businessName,

        @Size(max = 255)
        String businessLocation,

        @Size(max = 1000)
        String businessDescription,

        boolean hasBusiness,

        @Size(max = 500)
        String businessWebsite

) {
}
