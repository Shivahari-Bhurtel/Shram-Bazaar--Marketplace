
package com.shrambazar.service.report;

import com.shrambazar.dto.report.*;
import com.shrambazar.entity.*;
import com.shrambazar.enums.*;
import com.shrambazar.repository.*;
import com.shrambazar.service.CurrentUserService;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ModerationService {

    private final ReportRepository reportRepository;
    private final ModerationActionRepository actionRepository;
    private final CurrentUserService currentUserService;
    private final UserRepository userRepository;

    public ModerationService(
            ReportRepository reportRepository,
            ModerationActionRepository actionRepository,
            CurrentUserService currentUserService,
            UserRepository userRepository) {

        this.reportRepository = reportRepository;
        this.actionRepository = actionRepository;
        this.currentUserService = currentUserService;
        this.userRepository = userRepository;
    }

    // Admin views all reports, optionally filtered by status
    @Transactional(readOnly = true)
    public List<AdminReportResponse> getReports(ReportStatus status) {

        requireAdmin();

        List<Report> reports = status == null
                ? reportRepository.findAll(
                Sort.by(Sort.Direction.DESC, "createdAt")
        )
                : reportRepository.findByStatusOrderByCreatedAtAsc(status);

        return reports.stream()
                .map(this::mapToAdminResponse)
                .toList();
    }

    // Admin views one report
    @Transactional(readOnly = true)
    public AdminReportResponse getReport(Long reportId) {

        requireAdmin();

        Report report = findReport(reportId);

        return mapToAdminResponse(report);
    }

    // Admin marks a report as under review
    @Transactional
    public AdminReportResponse markUnderReview(Long reportId) {

        requireAdmin();

        Report report = findReport(reportId);

        if (report.getStatus() != ReportStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Only pending reports can be moved under review"
            );
        }

        report.setStatus(ReportStatus.UNDER_REVIEW);

        return mapToAdminResponse(report);
    }

    // Admin takes a moderation action
    @Transactional
    public AdminReportResponse takeAction(
            Long reportId,
            ModerationActionRequest request) {

        User admin = requireAdmin();

        Report report = findReport(reportId);

        if (report.getStatus() != ReportStatus.PENDING &&
                report.getStatus() != ReportStatus.UNDER_REVIEW) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This report has already been resolved"
            );
        }

        if (request.actionType() == ModerationActionType.ACCOUNT_REACTIVATED) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Use the account reactivation endpoint instead"
            );
        }

        applyModerationAction(report, request.actionType());

        ModerationAction action = new ModerationAction();

        action.setReport(report);
        action.setAdmin(admin);
        action.setActionType(request.actionType());
        action.setReason(request.reason().trim());

        actionRepository.save(action);

        if (request.actionType() == ModerationActionType.REPORT_DISMISSED) {
            report.setStatus(ReportStatus.REJECTED);
        } else {
            report.setStatus(ReportStatus.RESOLVED);
        }

        report.setResolvedAt(LocalDateTime.now());

        return mapToAdminResponse(report);
    }

    private void applyModerationAction(
            Report report,
            ModerationActionType actionType) {

        switch (actionType) {

            case JOB_POST_REMOVED -> {

                JobPost job = report.getReportedJobPost();

                if (job == null) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "This report does not concern a job post"
                    );
                }

                job.setStatus(JobPostStatus.REMOVED);
            }

            case ACCOUNT_SUSPENDED -> {

                User target = report.getReportedUser();

                if (target == null) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "This report does not concern a user account"
                    );
                }

                if (target.getRole() == UserRole.ADMIN) {
                    throw new ResponseStatusException(
                            HttpStatus.FORBIDDEN,
                            "Administrator accounts cannot be suspended through this action"
                    );
                }

                target.setStatus(AccountStatus.SUSPENDED);
            }

            case ACCOUNT_REACTIVATED -> {

                User target = report.getReportedUser();

                if (target == null) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "This report does not concern a user account"
                    );
                }

                if (target.getRole() == UserRole.ADMIN) {
                    throw new ResponseStatusException(
                            HttpStatus.FORBIDDEN,
                            "This action cannot modify administrator accounts"
                    );
                }

                target.setStatus(AccountStatus.ACTIVE);
            }

            case WARNING_ISSUED -> {
                // The warning is recorded in ModerationAction.
            }

            case REPORT_DISMISSED -> {
                // The report will be marked REJECTED.
            }

            case OTHER -> {
                // The admin's explanation is recorded in ModerationAction.
            }
        }
    }

    private User requireAdmin() {

        User user = currentUserService.getCurrentUser();

        if (user.getRole() != UserRole.ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Administrator access required"
            );
        }

        return user;
    }

    private Report findReport(Long reportId) {

        return reportRepository.findById(reportId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Report not found"
                        )
                );
    }

    private AdminReportResponse mapToAdminResponse(Report report) {

        User reportedUser = report.getReportedUser();
        JobPost reportedJob = report.getReportedJobPost();

        List<ModerationActionResponse> actions =
                actionRepository
                        .findByReportIdOrderByCreatedAtDesc(report.getId())
                        .stream()
                        .map(action -> new ModerationActionResponse(
                                action.getId(),
                                action.getAdmin().getId(),
                                action.getAdmin().getFullName(),
                                action.getActionType(),
                                action.getReason(),
                                action.getCreatedAt()
                        ))
                        .toList();

        return new AdminReportResponse(
                report.getId(),

                report.getReporter().getId(),
                report.getReporter().getFullName(),
                report.getReporter().getEmail(),

                reportedUser == null ? null : reportedUser.getId(),
                reportedUser == null ? null : reportedUser.getFullName(),
                reportedUser == null ? null : reportedUser.getEmail(),

                reportedJob == null ? null : reportedJob.getId(),
                reportedJob == null ? null : reportedJob.getTitle(),

                report.getReason(),
                report.getDescription(),
                report.getStatus(),

                report.getCreatedAt(),
                report.getResolvedAt(),

                actions
        );
    }

    // Admin independently suspends a user account
    @Transactional
    public void suspendUser(Long userId) {

        requireAdmin();

        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                ));

        if (target.getRole() == UserRole.ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Administrator accounts cannot be suspended"
            );
        }

        if (target.getStatus() == AccountStatus.SUSPENDED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This account is already suspended"
            );
        }

        target.setStatus(AccountStatus.SUSPENDED);
    }


    // Admin independently reactivates a suspended user account
    @Transactional
    public void reactivateUser(Long userId) {

        requireAdmin();

        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                ));

        if (target.getRole() == UserRole.ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Administrator accounts cannot be modified"
            );
        }

        if (target.getStatus() != AccountStatus.SUSPENDED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This account is not suspended"
            );
        }

        target.setStatus(AccountStatus.ACTIVE);
    }
}
