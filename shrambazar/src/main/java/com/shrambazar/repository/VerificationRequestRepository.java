
package com.shrambazar.repository;

import com.shrambazar.entity.VerificationRequest;
import com.shrambazar.enums.VerificationStatus;
import com.shrambazar.enums.VerificationType;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.shrambazar.enums.UserRole;

public interface VerificationRequestRepository
        extends JpaRepository<VerificationRequest, Long> {

    List<VerificationRequest> findByUserIdOrderBySubmittedAtDesc(
            Long userId
    );

    Optional<VerificationRequest> findByIdAndUserId(
            Long id,
            Long userId
    );

    List<VerificationRequest> findByStatusOrderBySubmittedAtAsc(
            VerificationStatus status
    );

    boolean existsByUserIdAndTypeAndStatus(
            Long userId,
            VerificationType type,
            VerificationStatus status
    );

    boolean existsByUserIdAndStatus(
            Long userId,
            VerificationStatus status
    );

    long countByStatus(VerificationStatus status);

    @Query("""
    SELECT COUNT(DISTINCT v.user.id)
    FROM VerificationRequest v
    WHERE v.user.role = :role
    AND v.status = :status
    """)
    long countVerifiedUsers(
            @Param("role") UserRole role,
            @Param("status") VerificationStatus status
    );

}
