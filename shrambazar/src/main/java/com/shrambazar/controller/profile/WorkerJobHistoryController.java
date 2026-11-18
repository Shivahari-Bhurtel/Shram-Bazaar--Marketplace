package com.shrambazar.controller.profile;

import com.shrambazar.dto.profile.WorkerJobHistoryResponse;
import com.shrambazar.service.profile.JobHistoryService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/workers")
public class WorkerJobHistoryController {

    private final JobHistoryService jobHistoryService;

    public WorkerJobHistoryController(
            JobHistoryService jobHistoryService
    ) {
        this.jobHistoryService = jobHistoryService;
    }

    @GetMapping("/{seekerProfileId}/job-history")
    public ResponseEntity<List<WorkerJobHistoryResponse>> getWorkerJobHistory(
            @PathVariable Long seekerProfileId
    ) {
        return ResponseEntity.ok(
                jobHistoryService.getWorkerJobHistory(seekerProfileId)
        );
    }
}