
package com.shrambazar.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "seeker_profiles")
public class SeekerProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(length = 500)
    private String profilePictureUrl;

    @Column(length = 1000)
    private String bio;

    @Column(length = 255)
    private String address;

    @Column(length = 254)
    private String contactEmail;

    @Column(length = 160)
    private String preferredWorkLocation;

    @Column(length = 120)
    private String availableStart;

    @Column(length = 255)
    private String referenceNote;

    private Boolean weekendsAvailable;

    private Integer preferredTravelDistanceKm;

    // Null on profiles created before this preference existed means enabled.
    private Boolean acceptingWork = true;

    private Double latitude;
    private Double longitude;
    @ElementCollection
    @CollectionTable(name = "seeker_preferred_categories", joinColumns = @JoinColumn(name = "seeker_profile_id"))
    @Column(name = "category", nullable = false, length = 80)
    private java.util.Set<String> preferredCategories = new java.util.LinkedHashSet<>();

    @ElementCollection
    @CollectionTable(name = "seeker_languages", joinColumns = @JoinColumn(name = "seeker_profile_id"))
    @Column(name = "language", nullable = false, length = 80)
    private java.util.Set<String> languages = new java.util.LinkedHashSet<>();

    @ElementCollection
    @CollectionTable(name = "seeker_certifications", joinColumns = @JoinColumn(name = "seeker_profile_id"))
    @Column(name = "certification", nullable = false, length = 160)
    private java.util.Set<String> certifications = new java.util.LinkedHashSet<>();

    @ElementCollection
    @CollectionTable(name = "seeker_employment_preferences", joinColumns = @JoinColumn(name = "seeker_profile_id"))
    @Column(name = "preference", nullable = false, length = 80)
    private java.util.Set<String> employmentPreferences = new java.util.LinkedHashSet<>();

    @ElementCollection
    @CollectionTable(name = "seeker_preferred_shifts", joinColumns = @JoinColumn(name = "seeker_profile_id"))
    @Column(name = "shift", nullable = false, length = 80)
    private java.util.Set<String> preferredShifts = new java.util.LinkedHashSet<>();

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public SeekerProfile() {
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getProfilePictureUrl() {
        return profilePictureUrl;
    }

    public void setProfilePictureUrl(String profilePictureUrl) {
        this.profilePictureUrl = profilePictureUrl;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }
    public String getPreferredWorkLocation() { return preferredWorkLocation; }
    public void setPreferredWorkLocation(String preferredWorkLocation) { this.preferredWorkLocation = preferredWorkLocation; }
    public String getAvailableStart() { return availableStart; }
    public void setAvailableStart(String availableStart) { this.availableStart = availableStart; }
    public String getReferenceNote() { return referenceNote; }
    public void setReferenceNote(String referenceNote) { this.referenceNote = referenceNote; }
    public Boolean getWeekendsAvailable() { return weekendsAvailable; }
    public void setWeekendsAvailable(Boolean weekendsAvailable) { this.weekendsAvailable = weekendsAvailable; }

    public Integer getPreferredTravelDistanceKm() {
        return preferredTravelDistanceKm;
    }

    public void setPreferredTravelDistanceKm(Integer preferredTravelDistanceKm) {
        this.preferredTravelDistanceKm = preferredTravelDistanceKm;
    }

    public boolean isAcceptingWork() { return acceptingWork == null || acceptingWork; }
    public void setAcceptingWork(Boolean acceptingWork) { this.acceptingWork = acceptingWork; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public java.util.Set<String> getPreferredCategories() { return preferredCategories; }
    public void setPreferredCategories(java.util.Set<String> preferredCategories) { this.preferredCategories = preferredCategories; }
    public java.util.Set<String> getLanguages() { return languages; }
    public void setLanguages(java.util.Set<String> languages) { this.languages = languages; }
    public java.util.Set<String> getCertifications() { return certifications; }
    public void setCertifications(java.util.Set<String> certifications) { this.certifications = certifications; }
    public java.util.Set<String> getEmploymentPreferences() { return employmentPreferences; }
    public void setEmploymentPreferences(java.util.Set<String> employmentPreferences) { this.employmentPreferences = employmentPreferences; }
    public java.util.Set<String> getPreferredShifts() { return preferredShifts; }
    public void setPreferredShifts(java.util.Set<String> preferredShifts) { this.preferredShifts = preferredShifts; }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
