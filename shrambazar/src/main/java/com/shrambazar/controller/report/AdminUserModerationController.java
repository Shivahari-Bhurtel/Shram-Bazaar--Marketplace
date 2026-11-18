
package com.shrambazar.controller.report;

import com.shrambazar.service.report.ModerationService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserModerationController {

    private final ModerationService moderationService;

    public AdminUserModerationController(
            ModerationService moderationService) {
        this.moderationService = moderationService;
    }

    // Suspend a user independently of reports
    @PatchMapping("/{userId}/suspend")
    public ResponseEntity<String> suspendUser(
            @PathVariable Long userId) {

        moderationService.suspendUser(userId);

        return ResponseEntity.ok("User account suspended successfully.");
    }

    // Reactivate a suspended user independently of reports
    @PatchMapping("/{userId}/reactivate")
    public ResponseEntity<String> reactivateUser(
            @PathVariable Long userId) {

        moderationService.reactivateUser(userId);

        return ResponseEntity.ok("User account reactivated successfully.");
    }
}
