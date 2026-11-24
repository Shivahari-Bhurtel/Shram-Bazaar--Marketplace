
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
        Double latitude,
        Double longitude,
        java.util.List<String> preferredCategories,
        java.util.List<String> languages,
        java.util.List<String> certifications,
        String contactEmail,
        String preferredWorkLocation,
        String availableStart,
        String referenceNote,
        Boolean weekendsAvailable,
        java.util.List<String> employmentPreferences,
        java.util.List<String> preferredShifts,
        boolean acceptingWork,
        boolean verified

) {
}
