package com.shrambazar.repository;

import com.shrambazar.entity.Qualification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QualificationRepository
        extends JpaRepository<Qualification, Long> {

    List<Qualification> findBySeekerProfileId(Long seekerProfileId);

    Optional<Qualification> findByIdAndSeekerProfileId(
            Long id, Long seekerProfileId
    );
}