package com.shrambazar.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "conversations", uniqueConstraints = @UniqueConstraint(name = "uk_conversation_job_pair", columnNames = {"job_post_id", "seeker_profile_id", "provider_profile_id"}))
public class Conversation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name="seeker_profile_id", nullable=false) private SeekerProfile seekerProfile;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name="provider_profile_id", nullable=false) private ProviderProfile providerProfile;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name="job_post_id") private JobPost jobPost;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name="application_id", unique=true) private Application application;
    @Column(nullable=false, length=20) private String status = "OPEN";
    @Column(nullable=false, updatable=false) private LocalDateTime createdAt;
    @Column(nullable=false) private LocalDateTime updatedAt;
    @PrePersist void create(){ createdAt=updatedAt=LocalDateTime.now(); }
    @PreUpdate void update(){ updatedAt=LocalDateTime.now(); }
    public Long getId(){return id;} public SeekerProfile getSeekerProfile(){return seekerProfile;} public void setSeekerProfile(SeekerProfile v){seekerProfile=v;}
    public ProviderProfile getProviderProfile(){return providerProfile;} public void setProviderProfile(ProviderProfile v){providerProfile=v;}
    public JobPost getJobPost(){return jobPost;} public void setJobPost(JobPost v){jobPost=v;}
    public Application getApplication(){return application;} public void setApplication(Application v){application=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;} public LocalDateTime getCreatedAt(){return createdAt;} public LocalDateTime getUpdatedAt(){return updatedAt;} public void touch(){updatedAt=LocalDateTime.now();}
}
