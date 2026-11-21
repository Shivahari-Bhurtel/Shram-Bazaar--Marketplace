
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

    private Integer preferredTravelDistanceKm;

    // Null on profiles created before this preference existed means enabled.
    private Boolean acceptingWork = true;

    private Double latitude;
    private Double longitude;
    @ElementCollection
    @CollectionTable(name = "seeker_preferred_categories", joinColumns = @JoinColumn(name = "seeker_profile_id"))
    @Column(name = "category", nullable = false, length = 80)
    private java.util.Set<String> preferredCategories = new java.util.LinkedHashSet<>();

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
