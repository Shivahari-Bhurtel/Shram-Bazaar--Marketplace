
package com.shrambazar.dto.auth;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public record ProviderRegisterRequest(

        @NotBlank
        @Size(max = 100)
        String fullName,

        @NotBlank
        @Email
        @Size(max = 254)
        String email,

        @NotBlank
        @Size(min = 8, max = 72)
        String password,

        @NotBlank
        String confirmPassword,

        @NotBlank
        @Pattern(regexp = "^\\+?[0-9]{7,15}$")
        String phoneNumber,

        @NotNull
        @Past
        LocalDate dateOfBirth,

        @Size(max = 255)
        String address,

        boolean hasBusiness,

        @Size(max = 150)
        String businessName,

        @Size(max = 255)
        String businessLocation,

        @Size(max = 1000)
        String businessDescription,

        @Size(max = 500)
        String businessWebsite

) {
}
