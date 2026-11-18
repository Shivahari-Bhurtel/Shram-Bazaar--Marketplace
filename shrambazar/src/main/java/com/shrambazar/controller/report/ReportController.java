
package com.shrambazar.controller.report;

import com.shrambazar.dto.report.ReportRequest;
import com.shrambazar.dto.report.ReportResponse;
import com.shrambazar.service.report.ReportService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@PreAuthorize("hasAnyRole('JOB_SEEKER', 'JOB_PROVIDER')")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    // Submit a report
    @PostMapping
    public ResponseEntity<ReportResponse> submitReport(
            @Valid @RequestBody ReportRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reportService.submitReport(request));
    }

    // View reports submitted by the logged-in user
    @GetMapping("/me")
    public ResponseEntity<List<ReportResponse>> getMyReports() {

        return ResponseEntity.ok(
                reportService.getMyReports()
        );
    }
}
