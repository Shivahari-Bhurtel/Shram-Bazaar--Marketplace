
package com.shrambazar.service.notification;

import com.shrambazar.dto.notification.*;
import com.shrambazar.entity.Notification;
import com.shrambazar.entity.User;
import com.shrambazar.enums.NotificationType;
import com.shrambazar.repository.NotificationRepository;
import com.shrambazar.service.CurrentUserService;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final CurrentUserService currentUserService;

    public NotificationService(
            NotificationRepository notificationRepository,
            CurrentUserService currentUserService) {

        this.notificationRepository = notificationRepository;
        this.currentUserService = currentUserService;
    }

    // Create notification for another user (internal service use)
    @Transactional
    public void createNotification(
            User recipient,
            NotificationType type,
            String title,
            String message,
            String referenceType,
            Long referenceId) {

        Notification notification = new Notification();

        notification.setUser(recipient);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setReferenceType(referenceType);
        notification.setReferenceId(referenceId);
        notification.setRead(false);

        notificationRepository.save(notification);
    }

    // Get all notifications of logged-in user
    @Transactional(readOnly = true)
    public List<NotificationResponse> getMyNotifications() {

        User user = currentUserService.getCurrentUser();

        return notificationRepository
                .findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // Get only unread notifications
    @Transactional(readOnly = true)
    public List<NotificationResponse> getUnreadNotifications() {

        User user = currentUserService.getCurrentUser();

        return notificationRepository
                .findByUserIdAndReadFalseOrderByCreatedAtDesc(
                        user.getId()
                )
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // Count unread notifications
    @Transactional(readOnly = true)
    public UnreadCountResponse getUnreadCount() {

        User user = currentUserService.getCurrentUser();

        return new UnreadCountResponse(
                notificationRepository.countByUserIdAndReadFalse(
                        user.getId()
                )
        );
    }

    // Mark one notification as read
    @Transactional
    public void markAsRead(Long notificationId) {

        User user = currentUserService.getCurrentUser();

        Notification notification =
                notificationRepository.findByIdAndUserId(
                        notificationId, user.getId()
                ).orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Notification not found"
                        )
                );

        if (!notification.isRead()) {
            notification.setRead(true);
            notification.setReadAt(LocalDateTime.now());
        }
    }

    // Mark all notifications as read
    @Transactional
    public void markAllAsRead() {

        User user = currentUserService.getCurrentUser();

        notificationRepository.markAllAsRead(
                user.getId(),
                LocalDateTime.now()
        );
    }

    private NotificationResponse mapToResponse(
            Notification notification) {

        return new NotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getReferenceType(),
                notification.getReferenceId(),
                notification.isRead(),
                notification.getCreatedAt(),
                notification.getReadAt()
        );
    }
}
