
package com.shrambazar.controller.profile;

import com.shrambazar.dto.profile.*;
import com.shrambazar.service.profile.ProfileService;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    // Job Seeker Profile

    @GetMapping("/seeker/profile")
    public ResponseEntity<SeekerProfileResponse> getSeekerProfile() {

        return ResponseEntity.ok(
                profileService.getSeekerProfile()
        );
    }

    @PutMapping("/seeker/profile")
    public ResponseEntity<SeekerProfileResponse> updateSeekerProfile(
            @Valid @RequestBody SeekerProfileUpdateRequest request) {

        return ResponseEntity.ok(
                profileService.updateSeekerProfile(request)
        );
    }

    // Job Provider Profile

    @GetMapping("/provider/profile")
    public ResponseEntity<ProviderProfileResponse> getProviderProfile() {

        return ResponseEntity.ok(
                profileService.getProviderProfile()
        );
    }

    @PutMapping("/provider/profile")
    public ResponseEntity<ProviderProfileResponse> updateProviderProfile(
            @Valid @RequestBody ProviderProfileUpdateRequest request) {

        return ResponseEntity.ok(
                profileService.updateProviderProfile(request)
        );
    }

    @PostMapping(
            value = "/seeker/profile/picture",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<SeekerProfileResponse> uploadSeekerProfilePicture(
            @RequestParam("file") MultipartFile file) {

        return ResponseEntity.ok(
                profileService.uploadSeekerProfilePicture(file)
        );
    }

    @PostMapping(
            value = "/provider/profile/picture",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<ProviderProfileResponse> uploadProviderProfilePicture(
            @RequestParam("file") MultipartFile file) {

        return ResponseEntity.ok(
                profileService.uploadProviderProfilePicture(file)
        );
    }
}
