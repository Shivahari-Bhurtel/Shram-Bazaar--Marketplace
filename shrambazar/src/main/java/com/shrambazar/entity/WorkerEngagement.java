
package com.shrambazar.entity;

import com.shrambazar.enums.EngagementStatus;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "worker_engagements",
        uniqueConstraints = @UniqueConstraint(
                columnNames = "application_id"
        )
)
public class WorkerEngagement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false, unique = true)
    private Application application;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EngagementStatus status = EngagementStatus.AWAITING_RESPONSE;

    private LocalDateTime selectedAt;

    private LocalDateTime respondedAt;

    private LocalDateTime startedAt;

    private LocalDateTime completedAt;

    private LocalDateTime cancelledAt;

    @Column(nullable = false)
    private boolean providerCompletionConfirmed = false;

    @Column(nullable = false)
    private boolean seekerCompletionConfirmed = false;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Column(nullable = false)
    private boolean upcomingWorkReminderSent = false;

    public WorkerEngagement() {
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();

        createdAt = now;
        updatedAt = now;

        if (selectedAt == null) {
            selectedAt = now;
        }
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

    public Application getApplication() {
        return application;
    }

    public void setApplication(Application application) {
        this.application = application;
    }

    public EngagementStatus getStatus() {
        return status;
    }

    public void setStatus(EngagementStatus status) {
        this.status = status;
    }

    public LocalDateTime getSelectedAt() {
        return selectedAt;
    }

    public void setSelectedAt(LocalDateTime selectedAt) {
        this.selectedAt = selectedAt;
    }

    public LocalDateTime getRespondedAt() {
        return respondedAt;
    }

    public void setRespondedAt(LocalDateTime respondedAt) {
        this.respondedAt = respondedAt;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public LocalDateTime getCancelledAt() {
        return cancelledAt;
    }

    public void setCancelledAt(LocalDateTime cancelledAt) {
        this.cancelledAt = cancelledAt;
    }

    public boolean isProviderCompletionConfirmed() {
        return providerCompletionConfirmed;
    }

    public void setProviderCompletionConfirmed(boolean providerCompletionConfirmed) {
        this.providerCompletionConfirmed = providerCompletionConfirmed;
    }

    public boolean isSeekerCompletionConfirmed() {
        return seekerCompletionConfirmed;
    }

    public void setSeekerCompletionConfirmed(boolean seekerCompletionConfirmed) {
        this.seekerCompletionConfirmed = seekerCompletionConfirmed;
    }

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
// Generate getters and setters using Alt + Insert.


    public boolean isUpcomingWorkReminderSent() {
        return upcomingWorkReminderSent;
    }

    public void setUpcomingWorkReminderSent(boolean upcomingWorkReminderSent) {
        this.upcomingWorkReminderSent = upcomingWorkReminderSent;
    }
}
