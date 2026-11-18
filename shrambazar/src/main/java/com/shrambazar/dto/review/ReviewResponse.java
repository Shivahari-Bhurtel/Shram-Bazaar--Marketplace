
package com.shrambazar.dto.review;

import com.shrambazar.enums.ReviewDirection;
import java.time.LocalDateTime;

public record ReviewResponse(

        Long id,
        Long engagementId,
        Long reviewerId,
        String reviewerName,
        Long revieweeId,
        String revieweeName,
        ReviewDirection direction,
        Integer rating,
        String comment,
        LocalDateTime createdAt

) {
}
