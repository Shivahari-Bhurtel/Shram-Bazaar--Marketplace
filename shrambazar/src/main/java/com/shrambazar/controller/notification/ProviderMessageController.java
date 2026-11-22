package com.shrambazar.controller.notification;

import com.shrambazar.dto.notification.ProviderMessageRequest;
import com.shrambazar.entity.Application;
import com.shrambazar.entity.ProviderProfile;
import com.shrambazar.entity.SeekerProfile;
import com.shrambazar.entity.User;
import com.shrambazar.enums.ApplicationStatus;
import com.shrambazar.enums.NotificationType;
import com.shrambazar.enums.UserRole;
import com.shrambazar.repository.ApplicationRepository;
import com.shrambazar.service.CurrentUserService;
import com.shrambazar.service.notification.NotificationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/applications")
@PreAuthorize("hasAnyRole('JOB_PROVIDER','JOB_SEEKER')")
public class ProviderMessageController {

    private final ApplicationRepository applicationRepository;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;

    public ProviderMessageController(
            ApplicationRepository applicationRepository,
            CurrentUserService currentUserService,
            NotificationService notificationService) {
        this.applicationRepository = applicationRepository;
        this.currentUserService = currentUserService;
        this.notificationService = notificationService;
    }

    @PostMapping("/{applicationId}/messages")
    public ResponseEntity<Void> sendMessage(
            @PathVariable Long applicationId,
            @Valid @RequestBody ProviderMessageRequest request) {
        User sender = currentUserService.getCurrentUser();
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));
        boolean providerSender = sender.getRole() == UserRole.JOB_PROVIDER;
        boolean ownsApplication = providerSender
                ? application.getJobPost().getProviderProfile().getUser().getId().equals(sender.getId())
                : sender.getRole() == UserRole.JOB_SEEKER && application.getSeekerProfile().getUser().getId().equals(sender.getId());
        if (!ownsApplication) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found");
        }
        if (application.getStatus() == ApplicationStatus.NOT_SELECTED
                || application.getStatus() == ApplicationStatus.WITHDRAWN
                || application.getStatus() == ApplicationStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This application is no longer active");
        }
        User recipient = providerSender
                ? application.getSeekerProfile().getUser()
                : application.getJobPost().getProviderProfile().getUser();
        String senderName = providerSender
                ? (application.getJobPost().getProviderProfile().getBusinessName() == null || application.getJobPost().getProviderProfile().getBusinessName().isBlank()
                    ? sender.getFullName() : application.getJobPost().getProviderProfile().getBusinessName())
                : sender.getFullName();
        notificationService.createNotification(
                recipient,
                NotificationType.MESSAGE,
                "Message from " + senderName,
                request.message().trim(),
                "APPLICATION",
                applicationId);
        return ResponseEntity.noContent().build();
    }
}
