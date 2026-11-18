
package com.shrambazar.controller.review;

import com.shrambazar.dto.review.*;
import com.shrambazar.service.review.ReviewService;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    // Submit a review
    @PostMapping("/engagements/{engagementId}/reviews")
    public ResponseEntity<ReviewResponse> submitReview(
            @PathVariable Long engagementId,
            @Valid @RequestBody ReviewRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reviewService.submitReview(
                        engagementId, request
                ));
    }

    // View reviews received by a user
    @GetMapping("/users/{userId}/reviews")
    public ResponseEntity<List<ReviewResponse>> getUserReviews(
            @PathVariable Long userId) {

        return ResponseEntity.ok(
                reviewService.getUserReviews(userId)
        );
    }

    // View reviews submitted by the logged-in user
    @GetMapping("/reviews/me")
    public ResponseEntity<List<ReviewResponse>> getMyReviews() {

        return ResponseEntity.ok(
                reviewService.getMyReviews()
        );
    }

    // View overall rating of a user
    @GetMapping("/users/{userId}/reviews/summary")
    public ResponseEntity<ReviewSummaryResponse> getUserRating(
            @PathVariable Long userId) {

        return ResponseEntity.ok(
                reviewService.getUserRating(userId)
        );
    }
}
