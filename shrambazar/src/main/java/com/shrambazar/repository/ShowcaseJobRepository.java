package com.shrambazar.repository;

import com.shrambazar.entity.ShowcaseJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShowcaseJobRepository extends JpaRepository<ShowcaseJob, Long> {
    List<ShowcaseJob> findAllByOrderByPostedDateDescTitleAsc();
}
