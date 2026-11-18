package com.shrambazar.repository;

import com.shrambazar.entity.SeekerSkill;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SeekerSkillRepository
        extends JpaRepository<SeekerSkill, Long> {

    List<SeekerSkill> findBySeekerProfileId(Long seekerProfileId);

    Optional<SeekerSkill> findByIdAndSeekerProfileId(
            Long id, Long seekerProfileId
    );

    Optional<SeekerSkill> findBySeekerProfileIdAndSkillId(
            Long seekerProfileId, Long skillId
    );
}