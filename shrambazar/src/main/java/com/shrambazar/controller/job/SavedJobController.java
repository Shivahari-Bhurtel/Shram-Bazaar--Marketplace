
package com.shrambazar.controller.job;

import com.shrambazar.dto.job.SavedJobResponse;
import com.shrambazar.service.job.SavedJobService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/seeker/saved-jobs")
public class SavedJobController {

    private final SavedJobService savedJobService;

    public SavedJobController(SavedJobService savedJobService) {
        this.savedJobService = savedJobService;
    }

    @GetMapping
    public ResponseEntity<List<SavedJobResponse>> getSavedJobs() {

        return ResponseEntity.ok(
                savedJobService.getMySavedJobs()
        );
    }

    @PutMapping("/{jobId}")
    public ResponseEntity<SavedJobResponse> saveJob(
            @PathVariable Long jobId) {

        return ResponseEntity.ok(
                savedJobService.saveJob(jobId)
        );
    }

    @DeleteMapping("/{jobId}")
    public ResponseEntity<Void> removeSavedJob(
            @PathVariable Long jobId) {

        savedJobService.removeSavedJob(jobId);

        return ResponseEntity.noContent().build();
    }
}
