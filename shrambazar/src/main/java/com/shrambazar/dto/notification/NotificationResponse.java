
package com.shrambazar.dto.notification;

import com.shrambazar.enums.NotificationType;
import java.time.LocalDateTime;

public record NotificationResponse(
        Long id,
        NotificationType type,
        String title,
        String message,
        String referenceType,
        Long referenceId,
        boolean read,
        LocalDateTime createdAt,
        LocalDateTime readAt
) {
}
