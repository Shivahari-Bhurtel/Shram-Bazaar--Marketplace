package com.shrambazar.repository;

import com.shrambazar.entity.WorkExperience;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WorkExperienceRepository
        extends JpaRepository<WorkExperience, Long> {

    List<WorkExperience> findBySeekerProfileId(Long seekerProfileId);

    Optional<WorkExperience> findByIdAndSeekerProfileId(
            Long id, Long seekerProfileId
    );
}