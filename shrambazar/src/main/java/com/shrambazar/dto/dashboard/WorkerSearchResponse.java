
package com.shrambazar.dto.dashboard;

import java.util.List;

public class WorkerSearchResponse {

    private Long seekerProfileId;
    private Long userId;
    private String fullName;
    private String profilePictureUrl;
    private String bio;
    private String address;
    private Integer preferredTravelDistanceKm;

    private List<String> skills;
    private List<String> qualifications;
    private List<String> workExperiences;
    private Double totalExperienceYears;

    private boolean verified;
    private Double averageRating;
    private long reviewCount;

    public WorkerSearchResponse(
            Long seekerProfileId,
            Long userId,
            String fullName,
            String profilePictureUrl,
            String bio,
            String address,
            Integer preferredTravelDistanceKm,
            List<String> skills,
            List<String> qualifications,
            List<String> workExperiences,
            Double totalExperienceYears,
            boolean verified,
            Double averageRating,
            long reviewCount
    ) {
        this.seekerProfileId = seekerProfileId;
        this.userId = userId;
        this.fullName = fullName;
        this.profilePictureUrl = profilePictureUrl;
        this.bio = bio;
        this.address = address;
        this.preferredTravelDistanceKm = preferredTravelDistanceKm;
        this.skills = skills;
        this.qualifications = qualifications;
        this.workExperiences = workExperiences;
        this.totalExperienceYears = totalExperienceYears;
        this.verified = verified;
        this.averageRating = averageRating;
        this.reviewCount = reviewCount;
    }

    public Long getSeekerProfileId() {
        return seekerProfileId;
    }

    public Long getUserId() {
        return userId;
    }

    public String getFullName() {
        return fullName;
    }

    public String getProfilePictureUrl() {
        return profilePictureUrl;
    }

    public String getBio() {
        return bio;
    }

    public String getAddress() {
        return address;
    }

    public Integer getPreferredTravelDistanceKm() {
        return preferredTravelDistanceKm;
    }

    public List<String> getSkills() {
        return skills;
    }

    public List<String> getQualifications() {
        return qualifications;
    }

    public List<String> getWorkExperiences() {
        return workExperiences;
    }

    public Double getTotalExperienceYears() {
        return totalExperienceYears;
    }

    public boolean isVerified() {
        return verified;
    }

    public Double getAverageRating() {
        return averageRating;
    }

    public long getReviewCount() {
        return reviewCount;
    }
}
