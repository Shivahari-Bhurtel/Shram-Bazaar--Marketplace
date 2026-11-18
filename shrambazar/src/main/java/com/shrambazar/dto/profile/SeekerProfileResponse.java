
package com.shrambazar.dto.profile;

import java.time.LocalDate;

public record SeekerProfileResponse(

        Long userId,
        String fullName,
        String email,
        String phoneNumber,
        LocalDate dateOfBirth,
        String profilePictureUrl,
        String bio,
        String address,
        Integer preferredTravelDistanceKm,
        boolean verified

) {
}
