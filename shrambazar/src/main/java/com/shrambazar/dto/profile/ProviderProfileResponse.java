
package com.shrambazar.dto.profile;

import java.time.LocalDate;

public record ProviderProfileResponse(

        Long userId,
        String fullName,
        String email,
        String phoneNumber,
        LocalDate dateOfBirth,
        String profilePictureUrl,
        String address,

        boolean hasBusiness,
        String businessName,
        String businessLocation,
        String businessDescription,
        String businessWebsite,

        boolean verified
) {
}
