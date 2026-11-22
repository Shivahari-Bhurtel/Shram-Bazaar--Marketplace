
package com.shrambazar.dto.auth;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public record SeekerRegisterRequest(

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
        String address

) {
}
