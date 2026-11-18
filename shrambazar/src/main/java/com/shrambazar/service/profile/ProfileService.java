
package com.shrambazar.service.profile;

import com.shrambazar.dto.profile.*;
import com.shrambazar.entity.*;
import com.shrambazar.enums.VerificationStatus;
import com.shrambazar.enums.VerificationType;
import com.shrambazar.repository.VerificationRequestRepository;
import com.shrambazar.service.CurrentUserService;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.web.multipart.MultipartFile;

@Service
public class ProfileService {

    private final CurrentUserService currentUserService;
    private final VerificationRequestRepository verificationRequestRepository;
    private final ProfilePictureService profilePictureService;

    public ProfileService(
            CurrentUserService currentUserService,
            VerificationRequestRepository verificationRequestRepository,
            ProfilePictureService profilePictureService) {
        this.currentUserService = currentUserService;
        this.verificationRequestRepository = verificationRequestRepository;
        this.profilePictureService = profilePictureService;
    }

    private boolean getIsVerified(Long userId, VerificationType type) {

        return verificationRequestRepository.existsByUserIdAndTypeAndStatus(
                userId,
                type,
                VerificationStatus.APPROVED
        );
    }

    @Transactional(readOnly = true)
    public SeekerProfileResponse getSeekerProfile() {

        SeekerProfile profile =
                currentUserService.getCurrentSeekerProfile();

        User user = profile.getUser();

        return new SeekerProfileResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getDateOfBirth(),
                profile.getProfilePictureUrl(),
                profile.getBio(),
                profile.getAddress(),
                profile.getPreferredTravelDistanceKm(),
                getIsVerified(user.getId(), VerificationType.IDENTITY)
        );
    }

    @Transactional
    public SeekerProfileResponse updateSeekerProfile(
            SeekerProfileUpdateRequest request) {

        SeekerProfile profile =
                currentUserService.getCurrentSeekerProfile();

        User user = profile.getUser();

        user.setFullName(request.fullName().trim());
        user.setPhoneNumber(request.phoneNumber());
        user.setDateOfBirth(request.dateOfBirth());

        profile.setAddress(request.address());
        profile.setBio(request.bio());
        profile.setPreferredTravelDistanceKm(
                request.preferredTravelDistanceKm()
        );

        return getSeekerProfile();
    }

    @Transactional(readOnly = true)
    public ProviderProfileResponse getProviderProfile() {

        ProviderProfile profile =
                currentUserService.getCurrentProviderProfile();

        User user = profile.getUser();

        return new ProviderProfileResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getDateOfBirth(),
                profile.getProfilePictureUrl(),
                profile.getAddress(),

                profile.isHasBusiness(),
                profile.getBusinessName(),
                profile.getBusinessLocation(),
                profile.getBusinessDescription(),
                profile.getBusinessWebsite(),

                getIsVerified(
                        user.getId(),
                        profile.isHasBusiness()
                                ? VerificationType.BUSINESS
                                : VerificationType.IDENTITY
                )
        );
    }


    @Transactional
    public ProviderProfileResponse updateProviderProfile(
            ProviderProfileUpdateRequest request) {

        ProviderProfile profile =
                currentUserService.getCurrentProviderProfile();

        User user = profile.getUser();

        if (profile.isHasBusiness() != request.hasBusiness()
                && verificationRequestRepository.existsByUserIdAndStatus(
                user.getId(),
                VerificationStatus.PENDING
        )) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "You cannot change your provider type while verification is pending."
            );
        }

        if (request.hasBusiness()) {
            if (request.businessName() == null || request.businessName().isBlank()) {
                throw new IllegalArgumentException("Business name is required.");
            }

            if (request.businessLocation() == null || request.businessLocation().isBlank()) {
                throw new IllegalArgumentException("Business location is required.");
            }
        }

        user.setFullName(request.fullName().trim());
        user.setPhoneNumber(request.phoneNumber());
        user.setDateOfBirth(request.dateOfBirth());

        profile.setAddress(request.address());
        profile.setHasBusiness(request.hasBusiness());

        if (request.hasBusiness()) {
            profile.setBusinessName(request.businessName());
            profile.setBusinessLocation(request.businessLocation());
            profile.setBusinessDescription(request.businessDescription());
            profile.setBusinessWebsite(request.businessWebsite());
        } else {
            profile.setBusinessName(null);
            profile.setBusinessLocation(null);
            profile.setBusinessDescription(null);
            profile.setBusinessWebsite(null);
        }

        return getProviderProfile();
    }

    @Transactional
    public SeekerProfileResponse uploadSeekerProfilePicture(MultipartFile file) {

        SeekerProfile profile = currentUserService.getCurrentSeekerProfile();

        String oldPictureUrl = profile.getProfilePictureUrl();

        String newPictureUrl = profilePictureService.uploadProfilePicture(file);

        profile.setProfilePictureUrl(newPictureUrl);

        if (oldPictureUrl != null && !oldPictureUrl.isBlank()) {
            profilePictureService.deleteProfilePicture(oldPictureUrl);
        }

        return getSeekerProfile();
    }

    @Transactional
    public ProviderProfileResponse uploadProviderProfilePicture(MultipartFile file) {

        ProviderProfile profile = currentUserService.getCurrentProviderProfile();

        String oldPictureUrl = profile.getProfilePictureUrl();

        String newPictureUrl = profilePictureService.uploadProfilePicture(file);

        profile.setProfilePictureUrl(newPictureUrl);

        if (oldPictureUrl != null && !oldPictureUrl.isBlank()) {
            profilePictureService.deleteProfilePicture(oldPictureUrl);
        }

        return getProviderProfile();
    }


}
