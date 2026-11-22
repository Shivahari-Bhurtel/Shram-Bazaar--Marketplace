
package com.shrambazar.repository;

import com.shrambazar.entity.Report;
import com.shrambazar.enums.ReportStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReportRepository extends JpaRepository<Report, Long> {

    List<Report> findByReporterIdOrderByCreatedAtDesc(Long reporterId);

    List<Report> findByStatusOrderByCreatedAtAsc(
            ReportStatus status
    );

    List<Report> findByReportedUserId(Long userId);

    List<Report> findByReportedJobPostId(Long jobPostId);

    List<Report> findAllByOrderByCreatedAtDesc();

    @Query("select count(r) from Report r where r.status = :status")
    long countByStatus(@Param("status") ReportStatus status);
}
