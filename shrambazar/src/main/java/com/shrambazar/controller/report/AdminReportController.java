
package com.shrambazar.controller.report;

import com.shrambazar.dto.report.*;
import com.shrambazar.enums.ReportStatus;
import com.shrambazar.service.report.ModerationService;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/reports")
@PreAuthorize("hasRole('ADMIN')")
public class AdminReportController {

    private final ModerationService moderationService;

    public AdminReportController(ModerationService moderationService) {
        this.moderationService = moderationService;
    }

    // View all reports or filter by status
    @GetMapping
    public ResponseEntity<List<AdminReportResponse>> getReports(
            @RequestParam(required = false) ReportStatus status) {

        return ResponseEntity.ok(
                moderationService.getReports(status)
        );
    }

    // View one report and its moderation history
    @GetMapping("/{reportId}")
    public ResponseEntity<AdminReportResponse> getReport(
            @PathVariable Long reportId) {

        return ResponseEntity.ok(
                moderationService.getReport(reportId)
        );
    }

    // Mark report as under review
    @PostMapping("/{reportId}/review")
    public ResponseEntity<AdminReportResponse> markUnderReview(
            @PathVariable Long reportId) {

        return ResponseEntity.ok(
                moderationService.markUnderReview(reportId)
        );
    }

    // Take moderation action
    @PostMapping("/{reportId}/actions")
    public ResponseEntity<AdminReportResponse> takeAction(
            @PathVariable Long reportId,
            @Valid @RequestBody ModerationActionRequest request) {

        return ResponseEntity.ok(
                moderationService.takeAction(reportId, request)
        );
    }
}
