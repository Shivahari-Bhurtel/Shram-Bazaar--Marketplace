
package com.shrambazar.repository;

import com.shrambazar.entity.Report;
import com.shrambazar.enums.ReportStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReportRepository extends JpaRepository<Report, Long> {

    List<Report> findByReporterIdOrderByCreatedAtDesc(Long reporterId);

    List<Report> findByStatusOrderByCreatedAtAsc(
            ReportStatus status
    );

    List<Report> findByReportedUserId(Long userId);

    List<Report> findByReportedJobPostId(Long jobPostId);

    List<Report> findAllByOrderByCreatedAtDesc();

    long countByStatus(ReportStatus status);
}
