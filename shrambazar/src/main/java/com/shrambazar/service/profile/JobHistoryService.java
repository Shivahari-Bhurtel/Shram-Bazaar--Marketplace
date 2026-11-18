package com.shrambazar.service.profile;

import com.shrambazar.dto.profile.WorkerJobHistoryResponse;
import com.shrambazar.entity.Review;
import com.shrambazar.entity.WorkerEngagement;
import com.shrambazar.enums.EngagementStatus;
import com.shrambazar.enums.ReviewDirection;
import com.shrambazar.repository.ReviewRepository;
import com.shrambazar.repository.WorkerEngagementRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class JobHistoryService {

    private final WorkerEngagementRepository engagementRepository;
    private final ReviewRepository reviewRepository;

    public JobHistoryService(
            WorkerEngagementRepository engagementRepository,
            ReviewRepository reviewRepository
    ) {
        this.engagementRepository = engagementRepository;
        this.reviewRepository = reviewRepository;
    }

    @Transactional(readOnly = true)
    public List<WorkerJobHistoryResponse> getWorkerJobHistory(
            Long seekerProfileId
    ) {

        List<WorkerEngagement> engagements =
                engagementRepository.findCompletedJobHistory(
                        seekerProfileId,
                        EngagementStatus.COMPLETED
                );

        return engagements.stream()
                .map(this::mapToResponse)
                .toList();
    }

    private WorkerJobHistoryResponse mapToResponse(
            WorkerEngagement engagement
    ) {

        var jobPost = engagement.getApplication().getJobPost();

        String location = String.join(", ",
                java.util.stream.Stream.of(
                                jobPost.getAddress(),
                                jobPost.getMunicipality(),
                                jobPost.getDistrict(),
                                jobPost.getProvince()
                        )
                        .filter(value -> value != null && !value.isBlank())
                        .distinct()
                        .toList()
        );

        Review providerReview = reviewRepository
                .findByEngagementIdAndDirection(
                        engagement.getId(),
                        ReviewDirection.PROVIDER_TO_WORKER
                )
                .orElse(null);

        return new WorkerJobHistoryResponse(
                engagement.getId(),
                jobPost.getId(),
                jobPost.getTitle(),
                jobPost.getDescription(),
                location,
                jobPost.getStartDate(),
                jobPost.getEndDate(),
                engagement.getCompletedAt(),
                providerReview != null
                        ? providerReview.getRating() : null,
                providerReview != null
                        ? providerReview.getComment() : null,
                providerReview != null
                        ? providerReview.getCreatedAt() : null
        );
    }
}