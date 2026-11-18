
package com.shrambazar.repository;

import com.shrambazar.entity.SavedJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SavedJobRepository
        extends JpaRepository<SavedJob, Long> {

    List<SavedJob> findBySeekerProfileIdOrderBySavedAtDesc(
            Long seekerProfileId
    );

    Optional<SavedJob> findBySeekerProfileIdAndJobPostId(
            Long seekerProfileId,
            Long jobPostId
    );

    boolean existsBySeekerProfileIdAndJobPostId(
            Long seekerProfileId,
            Long jobPostId
    );
}
