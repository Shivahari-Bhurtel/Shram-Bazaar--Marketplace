
package com.shrambazar.controller.application;

import com.shrambazar.dto.application.*;
import com.shrambazar.service.application.ApplicationService;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    // Seeker applies for a job
    @PostMapping("/jobs/{jobId}/applications")
    public ResponseEntity<ApplicationResponse> applyForJob(
            @PathVariable Long jobId) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(applicationService.applyForJob(jobId));
    }

    // Seeker views own applications
    @GetMapping("/seeker/applications")
    public ResponseEntity<List<ApplicationResponse>> getMyApplications() {

        return ResponseEntity.ok(
                applicationService.getMyApplications()
        );
    }

    // Seeker views one application
    @GetMapping("/seeker/applications/{id}")
    public ResponseEntity<ApplicationResponse> getMyApplication(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                applicationService.getMyApplication(id)
        );
    }

    // Seeker withdraws application
    @PostMapping("/seeker/applications/{id}/withdraw")
    public ResponseEntity<Void> withdrawApplication(
            @PathVariable Long id) {

        applicationService.withdrawApplication(id);
        return ResponseEntity.noContent().build();
    }

    // Provider views applicants for their job
    @GetMapping("/provider/jobs/{jobId}/applications")
    public ResponseEntity<List<ApplicantResponse>> getJobApplicants(
            @PathVariable Long jobId) {

        return ResponseEntity.ok(
                applicationService.getJobApplicants(jobId)
        );
    }

    // Provider rejects an applicant
    @PostMapping("/provider/jobs/{jobId}/applications/{applicationId}/reject")
    public ResponseEntity<Void> rejectApplication(
            @PathVariable Long jobId,
            @PathVariable Long applicationId) {

        applicationService.rejectApplication(jobId, applicationId);
        return ResponseEntity.noContent().build();
    }
}
