package com.shrambazar.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "worker_service_listings")
public class WorkerServiceListing {
    public enum PricingType { PER_HOUR, PER_DAY, FIXED, NEGOTIABLE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seeker_profile_id", nullable = false)
    private SeekerProfile seekerProfile;

    @Column(nullable = false, length = 100)
    private String category;
    @Column(nullable = false, length = 140)
    private String title;
    @Column(nullable = false, length = 3000)
    private String description;
    @Column(name = "skills_text", length = 1200)
    private String skillsText;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private PricingType pricingType;
    @Column(precision = 12, scale = 2)
    private BigDecimal price;
    private Integer minimumDurationHours;
    @Column(length = 160)
    private String serviceArea;
    @Column(nullable = false)
    private boolean active = true;
    @Column(nullable = false)
    private boolean negotiable;
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() { createdAt = updatedAt = LocalDateTime.now(); }
    @PreUpdate
    void onUpdate() { updatedAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public SeekerProfile getSeekerProfile() { return seekerProfile; }
    public void setSeekerProfile(SeekerProfile value) { seekerProfile = value; }
    public String getCategory() { return category; }
    public void setCategory(String value) { category = value; }
    public String getTitle() { return title; }
    public void setTitle(String value) { title = value; }
    public String getDescription() { return description; }
    public void setDescription(String value) { description = value; }
    public String getSkillsText() { return skillsText; }
    public void setSkillsText(String value) { skillsText = value; }
    public PricingType getPricingType() { return pricingType; }
    public void setPricingType(PricingType value) { pricingType = value; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal value) { price = value; }
    public Integer getMinimumDurationHours() { return minimumDurationHours; }
    public void setMinimumDurationHours(Integer value) { minimumDurationHours = value; }
    public String getServiceArea() { return serviceArea; }
    public void setServiceArea(String value) { serviceArea = value; }
    public boolean isActive() { return active; }
    public void setActive(boolean value) { active = value; }
    public boolean isNegotiable() { return negotiable; }
    public void setNegotiable(boolean value) { negotiable = value; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
