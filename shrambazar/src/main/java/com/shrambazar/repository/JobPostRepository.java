
package com.shrambazar.repository;

import com.shrambazar.entity.JobPost;
import com.shrambazar.enums.JobPostStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Collection;
import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface JobPostRepository extends JpaRepository<JobPost, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT j FROM JobPost j WHERE j.id = :jobId")
    Optional<JobPost> findByIdForUpdate(@Param("jobId") Long jobId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
       SELECT j FROM JobPost j
       WHERE j.id = :jobId
       AND j.providerProfile.id = :providerId
       """)
    Optional<JobPost> findByIdAndProviderProfileIdForUpdate(
            @Param("jobId") Long jobId,
            @Param("providerId") Long providerId
    );

    Page<JobPost> findByProviderProfileIdAndStatus(
            Long providerId,
            JobPostStatus status,
            Pageable pageable
    );

    List<JobPost> findByProviderProfileIdOrderByCreatedAtDesc(
            Long providerId
    );

    List<JobPost> findByStatusOrderByCreatedAtDesc(
            JobPostStatus status
    );

    List<JobPost> findByStatusInOrderByCreatedAtDesc(Collection<JobPostStatus> statuses);

    List<JobPost> findByProviderProfileIdAndStatus(
            Long providerId,
            JobPostStatus status
    );

    Optional<JobPost> findByIdAndProviderProfileId(
            Long id,
            Long providerProfileId
    );

    // Dashboard: count all posts
    long countByProviderProfileId(Long providerId);

    // Dashboard: count active posts
    long countByProviderProfileIdAndStatus(
            Long providerId,
            JobPostStatus status
    );

    // Dashboard: retrieve five latest posts
    List<JobPost> findTop5ByProviderProfileIdOrderByCreatedAtDesc(
            Long providerId
    );

    long countByStatus(JobPostStatus status);
}
