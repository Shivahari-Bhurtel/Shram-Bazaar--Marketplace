
package com.shrambazar.dto.review;

public record ReviewSummaryResponse(

        Long userId,
        Double averageRating,
        Long totalReviews

) {
}
