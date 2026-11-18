
package com.shrambazar.service.dashboard;

import com.shrambazar.dto.dashboard.ProviderDashboardResponse;
import com.shrambazar.entity.JobPost;
import com.shrambazar.entity.ProviderProfile;
import com.shrambazar.enums.JobPostStatus;
import com.shrambazar.repository.JobPostRepository;

import com.shrambazar.service.CurrentUserService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ProviderDashboardService {

    private final JobPostRepository jobPostRepository;
    private final CurrentUserService currentUserService;

    public ProviderDashboardService(
            JobPostRepository jobPostRepository,
            CurrentUserService currentUserService
    ) {
        this.jobPostRepository = jobPostRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public ProviderDashboardResponse getDashboard() {

        // Get authenticated provider
        ProviderProfile provider =
                currentUserService.getCurrentProviderProfile();

        Long providerId = provider.getId();

        // Total job posts
        long totalJobPosts =
                jobPostRepository.countByProviderProfileId(providerId);

        // Active job posts count
        long activeJobPosts =
                jobPostRepository.countByProviderProfileIdAndStatus(
                        providerId,
                        JobPostStatus.OPEN
                );

        // Retrieve all active job posts
        List<JobPost> activePosts =
                jobPostRepository.findByProviderProfileIdAndStatus(
                        providerId,
                        JobPostStatus.OPEN
                );

        // Retrieve five most recent job posts
        List<JobPost> recentPosts =
                jobPostRepository
                        .findTop5ByProviderProfileIdOrderByCreatedAtDesc(
                                providerId
                        );

        // Convert active posts into DTOs
        List<ProviderDashboardResponse.JobPostSummaryResponse>
                activeJobPostList = activePosts.stream()
                .map(this::mapToJobPostSummary)
                .toList();

        // Convert recent posts into DTOs
        List<ProviderDashboardResponse.JobPostSummaryResponse>
                recentJobPosts = recentPosts.stream()
                .map(this::mapToJobPostSummary)
                .toList();

        return new ProviderDashboardResponse(
                totalJobPosts,
                activeJobPosts,
                activeJobPostList,
                recentJobPosts
        );
    }

    private ProviderDashboardResponse.JobPostSummaryResponse
    mapToJobPostSummary(JobPost job) {

        return new ProviderDashboardResponse.JobPostSummaryResponse(
                job.getId(),
                job.getTitle(),
                job.getAddress(),
                job.getMunicipality(),
                job.getDistrict(),
                job.getProvince(),
                job.getPaymentAmount(),
                job.getPaymentMethod(),
                job.getNumberOfWorkersRequired(),
                job.getStatus(),
                job.getCreatedAt()
        );
    }
}
