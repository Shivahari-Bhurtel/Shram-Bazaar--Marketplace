package com.shrambazar.repository;

import com.shrambazar.entity.JobPostSkill;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JobPostSkillRepository
        extends JpaRepository<JobPostSkill, Long> {

    List<JobPostSkill> findByJobPostId(Long jobPostId);

    boolean existsByJobPostIdAndSkillId(Long jobPostId, Long skillId);
}