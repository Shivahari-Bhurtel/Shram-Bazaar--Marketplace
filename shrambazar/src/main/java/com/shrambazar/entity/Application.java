
package com.shrambazar.entity;

import com.shrambazar.enums.ApplicationStatus;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "applications",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"job_post_id", "seeker_profile_id"}
        )
)
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_post_id", nullable = false)
    private JobPost jobPost;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seeker_profile_id", nullable = false)
    private SeekerProfile seekerProfile;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ApplicationStatus status = ApplicationStatus.PENDING;

    @Column(nullable = false, updatable = false)
    private LocalDateTime appliedAt;

    private LocalDateTime updatedAt;

    @Column(precision = 12, scale = 2)
    private BigDecimal offeredAmount;

    @Column(length = 1200)
    private String offerMessage;

    private Integer estimatedDurationHours;

    private LocalDateTime proposedStartAt;

    @Column(name = "applicant_name", nullable = false, length = 120)
    private String applicantName;

    @Column(name = "applicant_email", nullable = false, length = 254)
    private String applicantEmail;

    @Column(name = "applicant_phone", nullable = false, length = 32)
    private String applicantPhone;

    @Column(name = "applicant_location", nullable = false, length = 255)
    private String applicantLocation;

    @Column(name = "experience_level", nullable = false, length = 32)
    private String experienceLevel = "No Experience";

    @Column(name = "introduction", nullable = false, length = 1200)
    private String introduction;

    @ElementCollection
    @CollectionTable(name = "application_skills", joinColumns = @JoinColumn(name = "application_id"))
    @Column(name = "skill", nullable = false, length = 80)
    private List<String> applicantSkills = new ArrayList<>();

    public Application() {
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        appliedAt = now;
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

    public JobPost getJobPost() {
        return jobPost;
    }

    public void setJobPost(JobPost jobPost) {
        this.jobPost = jobPost;
    }

    public SeekerProfile getSeekerProfile() {
        return seekerProfile;
    }

    public void setSeekerProfile(SeekerProfile seekerProfile) {
        this.seekerProfile = seekerProfile;
    }

    public ApplicationStatus getStatus() {
        return status;
    }

    public void setStatus(ApplicationStatus status) {
        this.status = status;
    }

    public LocalDateTime getAppliedAt() {
        return appliedAt;
    }

    public void setAppliedAt(LocalDateTime appliedAt) {
        this.appliedAt = appliedAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public BigDecimal getOfferedAmount() { return offeredAmount; }
    public void setOfferedAmount(BigDecimal value) { offeredAmount = value; }
    public String getOfferMessage() { return offerMessage; }
    public void setOfferMessage(String value) { offerMessage = value; }
    public Integer getEstimatedDurationHours() { return estimatedDurationHours; }
    public void setEstimatedDurationHours(Integer value) { estimatedDurationHours = value; }
    public LocalDateTime getProposedStartAt() { return proposedStartAt; }
    public void setProposedStartAt(LocalDateTime value) { proposedStartAt = value; }
    public String getApplicantName() { return applicantName; }
    public void setApplicantName(String value) { applicantName = value; }
    public String getApplicantEmail() { return applicantEmail; }
    public void setApplicantEmail(String value) { applicantEmail = value; }
    public String getApplicantPhone() { return applicantPhone; }
    public void setApplicantPhone(String value) { applicantPhone = value; }
    public String getApplicantLocation() { return applicantLocation; }
    public void setApplicantLocation(String value) { applicantLocation = value; }
    public String getExperienceLevel() { return experienceLevel; }
    public void setExperienceLevel(String value) { experienceLevel = value; }
    public String getIntroduction() { return introduction; }
    public void setIntroduction(String value) { introduction = value; }
    public List<String> getApplicantSkills() { return applicantSkills; }
    public void setApplicantSkills(List<String> value) { applicantSkills = value; }
}
