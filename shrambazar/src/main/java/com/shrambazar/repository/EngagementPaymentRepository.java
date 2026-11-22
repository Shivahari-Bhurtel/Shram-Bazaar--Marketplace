package com.shrambazar.repository;

import com.shrambazar.entity.EngagementPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface EngagementPaymentRepository extends JpaRepository<EngagementPayment, Long> {
    List<EngagementPayment> findByEngagementApplicationJobPostProviderProfileIdOrderByPaymentDateDesc(Long providerId);
    Optional<EngagementPayment> findByEngagementId(Long engagementId);
}
