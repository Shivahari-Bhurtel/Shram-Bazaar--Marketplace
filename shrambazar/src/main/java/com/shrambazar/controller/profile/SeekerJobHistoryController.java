package com.shrambazar.controller.profile;

import com.shrambazar.dto.profile.WorkerJobHistoryResponse;
import com.shrambazar.service.CurrentUserService;
import com.shrambazar.service.profile.JobHistoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/seeker")
public class SeekerJobHistoryController {

    private final CurrentUserService currentUserService;
    private final JobHistoryService jobHistoryService;

    public SeekerJobHistoryController(
            CurrentUserService currentUserService,
            JobHistoryService jobHistoryService
    ) {
        this.currentUserService = currentUserService;
        this.jobHistoryService = jobHistoryService;
    }

    @GetMapping("/job-history")
    public ResponseEntity<List<WorkerJobHistoryResponse>> getMyJobHistory() {
        var seekerProfile = currentUserService.getCurrentSeekerProfile();
        return ResponseEntity.ok(
                jobHistoryService.getWorkerJobHistory(seekerProfile.getId())
        );
    }
}
