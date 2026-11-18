
package com.shrambazar.repository;

import com.shrambazar.entity.Review;
import com.shrambazar.enums.ReviewDirection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByRevieweeIdOrderByCreatedAtDesc(Long revieweeId);

    List<Review> findByReviewerIdOrderByCreatedAtDesc(Long reviewerId);

    List<Review> findByEngagementId(Long engagementId);

    Optional<Review> findByEngagementIdAndDirection(
            Long engagementId,
            ReviewDirection direction
    );

    boolean existsByEngagementIdAndDirection(
            Long engagementId,
            ReviewDirection direction
    );
}
