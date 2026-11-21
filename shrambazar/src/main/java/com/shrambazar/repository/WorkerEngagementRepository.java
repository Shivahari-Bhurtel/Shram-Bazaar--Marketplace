
package com.shrambazar.repository;

import com.shrambazar.entity.SeekerProfile;
import com.shrambazar.entity.WorkerEngagement;
import com.shrambazar.enums.EngagementStatus;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface WorkerEngagementRepository
        extends JpaRepository<WorkerEngagement, Long> {


    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
    SELECT e FROM WorkerEngagement e
    WHERE e.id = :engagementId
    AND e.application.jobPost.providerProfile.id = :providerId
    """)
    Optional<WorkerEngagement> findForProviderForUpdate(
            @Param("engagementId") Long engagementId,
            @Param("providerId") Long providerId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
    SELECT e FROM WorkerEngagement e
    WHERE e.id = :engagementId
    AND e.application.seekerProfile.id = :seekerId
    """)
    Optional<WorkerEngagement> findForSeekerForUpdate(
            @Param("engagementId") Long engagementId,
            @Param("seekerId") Long seekerId
    );


    Optional<WorkerEngagement> findByApplicationId(Long applicationId);

    List<WorkerEngagement> findByApplicationSeekerProfileId(
            Long seekerProfileId
    );

    List<WorkerEngagement> findByApplicationJobPostProviderProfileId(
            Long providerProfileId
    );

    List<WorkerEngagement> findByApplicationJobPostId(Long jobPostId);

    List<WorkerEngagement> findByStatus(EngagementStatus status);

    boolean existsByApplicationId(Long applicationId);

    @Query("""
        SELECT COUNT(e)
        FROM WorkerEngagement e
        WHERE e.application.jobPost.id = :jobId
        AND e.status IN :statuses
        """)
    long countByJobAndStatuses(
            @Param("jobId") Long jobId,
            @Param("statuses") Collection<EngagementStatus> statuses
    );

    @Query("""
        SELECT e
        FROM WorkerEngagement e
        WHERE e.id = :engagementId
        AND e.application.seekerProfile.id = :seekerProfileId
        """)
    Optional<WorkerEngagement> findForSeeker(
            @Param("engagementId") Long engagementId,
            @Param("seekerProfileId") Long seekerProfileId
    );

    @Query("""
    SELECT e
    FROM WorkerEngagement e
    WHERE e.status = :status
    AND e.upcomingWorkReminderSent = false
    AND (
        e.application.jobPost.startDate > :fromDate
        OR (
            e.application.jobPost.startDate = :fromDate
            AND e.application.jobPost.startTime >= :fromTime
        )
    )
    AND (
        e.application.jobPost.startDate < :toDate
        OR (
            e.application.jobPost.startDate = :toDate
            AND e.application.jobPost.startTime < :toTime
        )
    )
    """)
    List<WorkerEngagement> findEngagementsForUpcomingReminder(
            @Param("status") EngagementStatus status,
            @Param("fromDate") java.time.LocalDate fromDate,
            @Param("fromTime") java.time.LocalTime fromTime,
            @Param("toDate") java.time.LocalDate toDate,
            @Param("toTime") java.time.LocalTime toTime
    );

    @Query("""
    SELECT e
    FROM WorkerEngagement e
    LEFT JOIN FETCH e.application a
    LEFT JOIN FETCH a.jobPost j
    WHERE a.seekerProfile.id = :seekerProfileId
    AND e.status = :status
    ORDER BY e.completedAt DESC
    """)
    List<WorkerEngagement> findCompletedJobHistory(
            @Param("seekerProfileId") Long seekerProfileId,
            @Param("status") EngagementStatus status
    );

    long countByStatus(EngagementStatus status);
}
