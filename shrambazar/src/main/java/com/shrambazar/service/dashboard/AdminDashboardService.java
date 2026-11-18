package com.shrambazar.service.dashboard;

import com.shrambazar.dto.dashboard.AdminDashboardResponse;
import com.shrambazar.entity.User;
import com.shrambazar.enums.*;

import com.shrambazar.repository.*;

import com.shrambazar.service.CurrentUserService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AdminDashboardService {

    private final UserRepository userRepository;
    private final VerificationRequestRepository verificationRequestRepository;
    private final JobPostRepository jobPostRepository;
    private final ApplicationRepository applicationRepository;
    private final WorkerEngagementRepository workerEngagementRepository;
    private final ReportRepository reportRepository;

    private final CurrentUserService currentUserService;

    public AdminDashboardService(
            UserRepository userRepository,
            VerificationRequestRepository verificationRequestRepository,
            JobPostRepository jobPostRepository,
            ApplicationRepository applicationRepository,
            WorkerEngagementRepository workerEngagementRepository,
            ReportRepository reportRepository,
            CurrentUserService currentUserService
    ) {
        this.userRepository = userRepository;
        this.verificationRequestRepository = verificationRequestRepository;
        this.jobPostRepository = jobPostRepository;
        this.applicationRepository = applicationRepository;
        this.workerEngagementRepository = workerEngagementRepository;
        this.reportRepository = reportRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboard() {

        requireAdmin();

        long totalWorkers =
                userRepository.countByRole(UserRole.JOB_SEEKER);

        long totalProviders =
                userRepository.countByRole(UserRole.JOB_PROVIDER);

        long verifiedWorkers =
                verificationRequestRepository.countVerifiedUsers(
                        UserRole.JOB_SEEKER,
                        VerificationStatus.APPROVED
                );

        long verifiedProviders =
                verificationRequestRepository.countVerifiedUsers(
                        UserRole.JOB_PROVIDER,
                        VerificationStatus.APPROVED
                );

        long pendingKycRequests =
                verificationRequestRepository.countByStatus(
                        VerificationStatus.PENDING
                );

        long activeJobListings =
                jobPostRepository.countByStatus(JobPostStatus.OPEN);

        long totalApplications =
                applicationRepository.count();

        long successfulHiring =
                workerEngagementRepository.countByStatus(
                        EngagementStatus.COMPLETED
                );

        long openComplaints =
                reportRepository.countByStatus(ReportStatus.PENDING)
                        + reportRepository.countByStatus(ReportStatus.UNDER_REVIEW);

        long suspendedAccounts =
                userRepository.countByStatus(AccountStatus.SUSPENDED);

        return new AdminDashboardResponse(
                totalWorkers,
                totalProviders,
                verifiedWorkers,
                verifiedProviders,
                pendingKycRequests,
                activeJobListings,
                totalApplications,
                successfulHiring,
                openComplaints,
                suspendedAccounts
        );
    }

    private void requireAdmin() {

        User user = currentUserService.getCurrentUser();

        if (user.getRole() != UserRole.ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Administrator access required"
            );
        }
    }
}