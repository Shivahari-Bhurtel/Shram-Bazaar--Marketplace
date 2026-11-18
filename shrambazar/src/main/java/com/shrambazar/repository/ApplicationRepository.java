
package com.shrambazar.repository;

import com.shrambazar.entity.Application;
import com.shrambazar.enums.ApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ApplicationRepository
        extends JpaRepository<Application, Long> {

    List<Application> findByJobPostIdOrderByAppliedAtDesc(Long jobPostId);

    List<Application> findBySeekerProfileIdOrderByAppliedAtDesc(
            Long seekerProfileId
    );

    Optional<Application> findByJobPostIdAndSeekerProfileId(
            Long jobPostId,
            Long seekerProfileId
    );

    Optional<Application> findByIdAndSeekerProfileId(
            Long id,
            Long seekerProfileId
    );

    Optional<Application> findByIdAndJobPostId(
            Long id,
            Long jobPostId
    );

    boolean existsByJobPostIdAndSeekerProfileId(
            Long jobPostId,
            Long seekerProfileId
    );

    @Query("""
            select case when count(a) > 0 then true else false end
            from Application a
            where a.jobPost.id = :jobPostId
              and a.seekerProfile.id = :seekerProfileId
            """)
    boolean existsForJobAndSeeker(
            @Param("jobPostId") Long jobPostId,
            @Param("seekerProfileId") Long seekerProfileId
    );

    List<Application> findByJobPostIdAndStatus(
            Long jobPostId,
            ApplicationStatus status
    );

    List<Application> findByJobPostId(Long jobId);
}
