
package com.shrambazar.service.report;

import com.shrambazar.dto.report.ReportRequest;
import com.shrambazar.dto.report.ReportResponse;
import com.shrambazar.entity.*;
import com.shrambazar.enums.*;
import com.shrambazar.repository.*;
import com.shrambazar.service.CurrentUserService;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class ReportService {

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final JobPostRepository jobPostRepository;
    private final CurrentUserService currentUserService;

    public ReportService(
            ReportRepository reportRepository,
            UserRepository userRepository,
            JobPostRepository jobPostRepository,
            CurrentUserService currentUserService) {

        this.reportRepository = reportRepository;
        this.userRepository = userRepository;
        this.jobPostRepository = jobPostRepository;
        this.currentUserService = currentUserService;
    }

    // User submits a report against another user or a job post
    @Transactional
    public ReportResponse submitReport(ReportRequest request) {

        User reporter = currentUserService.getCurrentUser();

        if (reporter.getRole() == UserRole.ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Administrators cannot submit reports"
            );
        }

        boolean reportingUser = request.reportedUserId() != null;
        boolean reportingJob = request.reportedJobPostId() != null;

        if (reportingUser == reportingJob) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Report exactly one user or one job post"
            );
        }

        Report report = new Report();

        report.setReporter(reporter);
        report.setReason(request.reason());
        report.setDescription(request.description().trim());
        report.setStatus(ReportStatus.PENDING);

        // Reporting another user
        if (reportingUser) {

            User reportedUser = userRepository
                    .findById(request.reportedUserId())
                    .orElseThrow(() ->
                            new ResponseStatusException(
                                    HttpStatus.NOT_FOUND,
                                    "Reported user not found"
                            )
                    );

            if (reportedUser.getId().equals(reporter.getId())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "You cannot report your own account"
                );
            }

            if (reportedUser.getRole() != UserRole.JOB_SEEKER
                    && reportedUser.getRole() != UserRole.JOB_PROVIDER) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "You can only report job seekers or job providers"
                );
            }

            report.setReportedUser(reportedUser);
        }

        // Reporting a job post
        if (reportingJob) {

            JobPost reportedJob = jobPostRepository
                    .findById(request.reportedJobPostId())
                    .orElseThrow(() ->
                            new ResponseStatusException(
                                    HttpStatus.NOT_FOUND,
                                    "Reported job not found"
                            )
                    );

            if (reportedJob.getProviderProfile()
                    .getUser().getId().equals(reporter.getId())) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "You cannot report your own job post"
                );
            }

            report.setReportedJobPost(reportedJob);
        }

        return mapToResponse(reportRepository.save(report));
    }

    // User views their submitted reports
    @Transactional(readOnly = true)
    public List<ReportResponse> getMyReports() {

        User user = currentUserService.getCurrentUser();

        return reportRepository
                .findByReporterIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    private ReportResponse mapToResponse(Report report) {

        return new ReportResponse(
                report.getId(),
                report.getReportedUser() == null
                        ? null : report.getReportedUser().getId(),
                report.getReportedJobPost() == null
                        ? null : report.getReportedJobPost().getId(),
                report.getReason(),
                report.getDescription(),
                report.getStatus(),
                report.getCreatedAt(),
                report.getResolvedAt()
        );
    }
}
