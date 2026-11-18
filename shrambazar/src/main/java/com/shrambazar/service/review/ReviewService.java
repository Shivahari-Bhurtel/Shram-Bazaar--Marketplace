
package com.shrambazar.service.review;

import com.shrambazar.dto.review.*;
import com.shrambazar.entity.*;
import com.shrambazar.enums.*;
import com.shrambazar.repository.*;
import com.shrambazar.service.CurrentUserService;

import com.shrambazar.service.notification.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final WorkerEngagementRepository engagementRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;

    public ReviewService(
            ReviewRepository reviewRepository,
            WorkerEngagementRepository engagementRepository,
            UserRepository userRepository,
            CurrentUserService currentUserService,
            NotificationService notificationService) {

        this.reviewRepository = reviewRepository;
        this.engagementRepository = engagementRepository;
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
        this.notificationService = notificationService;
    }

    // Submit a review after completed work
    @Transactional
    public ReviewResponse submitReview(
            Long engagementId,
            ReviewRequest request) {

        User reviewer = currentUserService.getCurrentUser();

        WorkerEngagement engagement;
        User reviewee;
        ReviewDirection direction;

        if (reviewer.getRole() == UserRole.JOB_SEEKER) {

            SeekerProfile seeker =
                    currentUserService.getCurrentSeekerProfile();

            engagement = engagementRepository
                    .findForSeekerForUpdate(
                            engagementId, seeker.getId()
                    )
                    .orElseThrow(() ->
                            new ResponseStatusException(
                                    HttpStatus.NOT_FOUND,
                                    "Engagement not found"
                            )
                    );

            reviewee = engagement.getApplication()
                    .getJobPost()
                    .getProviderProfile()
                    .getUser();

            direction = ReviewDirection.WORKER_TO_PROVIDER;

        } else if (reviewer.getRole() == UserRole.JOB_PROVIDER) {

            ProviderProfile provider =
                    currentUserService.getCurrentProviderProfile();

            engagement = engagementRepository
                    .findForProviderForUpdate(
                            engagementId, provider.getId()
                    )
                    .orElseThrow(() ->
                            new ResponseStatusException(
                                    HttpStatus.NOT_FOUND,
                                    "Engagement not found"
                            )
                    );

            reviewee = engagement.getApplication()
                    .getSeekerProfile()
                    .getUser();

            direction = ReviewDirection.PROVIDER_TO_WORKER;

        } else {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Administrators cannot submit participant reviews"
            );
        }

        if (engagement.getStatus() != EngagementStatus.COMPLETED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Reviews can only be submitted after job completion"
            );
        }

        if (reviewRepository.existsByEngagementIdAndDirection(
                engagementId, direction)) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "You have already reviewed this engagement"
            );
        }

        Review review = new Review();

        review.setEngagement(engagement);
        review.setReviewer(reviewer);
        review.setReviewee(reviewee);
        review.setDirection(direction);
        review.setRating(request.rating());
        review.setComment(
                request.comment() == null ||
                        request.comment().isBlank()
                        ? null
                        : request.comment().trim()
        );

        Review savedReview = reviewRepository.save(review);

        notificationService.createNotification(
                reviewee,
                NotificationType.REVIEW_RECEIVED,
                "You received a new review",
                reviewer.getFullName() + " reviewed your completed job.",
                "REVIEW",
                savedReview.getId()
        );

        return mapToResponse(savedReview);
    }

    // View reviews received by a user
    @Transactional(readOnly = true)
    public List<ReviewResponse> getUserReviews(Long userId) {

        if (!userRepository.existsById(userId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "User not found"
            );
        }

        return reviewRepository
                .findByRevieweeIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // View reviews submitted by the currently logged-in user
    @Transactional(readOnly = true)
    public List<ReviewResponse> getMyReviews() {

        User user = currentUserService.getCurrentUser();

        return reviewRepository
                .findByReviewerIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // Calculate overall rating
    @Transactional(readOnly = true)
    public ReviewSummaryResponse getUserRating(Long userId) {

        if (!userRepository.existsById(userId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "User not found"
            );
        }

        List<Review> reviews =
                reviewRepository.findByRevieweeIdOrderByCreatedAtDesc(userId);

        double average = reviews.stream()
                .mapToInt(Review::getRating)
                .average()
                .orElse(0.0);

        return new ReviewSummaryResponse(
                userId,
                Math.round(average * 100.0) / 100.0,
                (long) reviews.size()
        );
    }

    private ReviewResponse mapToResponse(Review review) {

        return new ReviewResponse(
                review.getId(),
                review.getEngagement().getId(),
                review.getReviewer().getId(),
                review.getReviewer().getFullName(),
                review.getReviewee().getId(),
                review.getReviewee().getFullName(),
                review.getDirection(),
                review.getRating(),
                review.getComment(),
                review.getCreatedAt()
        );
    }
}
