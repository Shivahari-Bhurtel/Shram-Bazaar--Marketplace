
package com.shrambazar.controller.engagement;

import com.shrambazar.dto.engagement.WorkerEngagementResponse;
import com.shrambazar.dto.engagement.WorkerRequestOffer;
import com.shrambazar.service.engagement.WorkerEngagementService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;

import com.shrambazar.dto.engagement.ProviderContactResponse;

@RestController
@RequestMapping("/api")
public class WorkerEngagementController {

    private final WorkerEngagementService engagementService;

    public WorkerEngagementController(
            WorkerEngagementService engagementService) {
        this.engagementService = engagementService;
    }

    // Provider selects an applicant
    @PostMapping("/provider/jobs/{jobId}/applications/{applicationId}/select")
    public ResponseEntity<WorkerEngagementResponse> selectApplicant(
            @PathVariable Long jobId,
            @PathVariable Long applicationId) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(engagementService.selectApplicant(
                        jobId, applicationId
                ));
    }

    @PostMapping("/provider/jobs/{jobId}/workers/{seekerUserId}/request")
    public ResponseEntity<WorkerEngagementResponse> requestWorker(
            @PathVariable Long jobId,
            @PathVariable Long seekerUserId,
            @Valid @RequestBody(required = false) WorkerRequestOffer offer) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(engagementService.requestWorker(jobId, seekerUserId, offer));
    }

    // Seeker views engagements
    @GetMapping("/seeker/engagements")
    public ResponseEntity<List<WorkerEngagementResponse>> getMyEngagements() {

        return ResponseEntity.ok(
                engagementService.getMyEngagements()
        );
    }

    // Provider views engagements
    @GetMapping("/provider/engagements")
    public ResponseEntity<List<WorkerEngagementResponse>>
    getProviderEngagements() {

        return ResponseEntity.ok(
                engagementService.getProviderEngagements()
        );
    }

    // Seeker confirms selection
    @PostMapping("/seeker/engagements/{engagementId}/confirm")
    public ResponseEntity<WorkerEngagementResponse> confirmEngagement(
            @PathVariable Long engagementId) {

        return ResponseEntity.ok(
                engagementService.confirmEngagement(engagementId)
        );
    }

    // Seeker declines selection
    @PostMapping("/seeker/engagements/{engagementId}/decline")
    public ResponseEntity<WorkerEngagementResponse> declineEngagement(
            @PathVariable Long engagementId) {

        return ResponseEntity.ok(
                engagementService.declineEngagement(engagementId)
        );
    }


    // Provider marks work as started
    @PostMapping("/provider/engagements/{engagementId}/start")
    public ResponseEntity<WorkerEngagementResponse> startWork(
            @PathVariable Long engagementId) {

        return ResponseEntity.ok(
                engagementService.startWork(engagementId)
        );
    }

    @PostMapping("/provider/engagements/{engagementId}/withdraw")
    public ResponseEntity<WorkerEngagementResponse> withdrawOffer(@PathVariable Long engagementId) {
        return ResponseEntity.ok(engagementService.withdrawPendingOffer(engagementId));
    }

    // Provider confirms work completion
    @PostMapping("/seeker/engagements/{engagementId}/request-completion")
    public ResponseEntity<WorkerEngagementResponse> requestCompletion(@PathVariable Long engagementId) {
        return ResponseEntity.ok(engagementService.requestCompletionBySeeker(engagementId));
    }

    @PostMapping("/provider/engagements/{engagementId}/request-completion")
    public ResponseEntity<WorkerEngagementResponse> requestCompletionByProvider(@PathVariable Long engagementId) {
        return ResponseEntity.ok(engagementService.requestCompletionByProvider(engagementId));
    }

    @PostMapping("/provider/engagements/{engagementId}/confirm-completion")
    public ResponseEntity<WorkerEngagementResponse>
    confirmCompletionByProvider(@PathVariable Long engagementId) {

        return ResponseEntity.ok(
                engagementService.confirmCompletionByProvider(engagementId)
        );
    }

    // Seeker confirms work completion
    @PostMapping("/seeker/engagements/{engagementId}/confirm-completion")
    public ResponseEntity<WorkerEngagementResponse>
    confirmCompletionBySeeker(@PathVariable Long engagementId) {

        return ResponseEntity.ok(
                engagementService.confirmCompletionBySeeker(engagementId)
        );
    }

    @GetMapping("/seeker/engagements/{engagementId}/provider-contact")
    public ResponseEntity<ProviderContactResponse> getProviderContact(
            @PathVariable Long engagementId) {

        return ResponseEntity.ok(
                engagementService.getProviderContact(engagementId)
        );
    }

}
