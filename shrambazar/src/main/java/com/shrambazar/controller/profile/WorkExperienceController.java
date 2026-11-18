
package com.shrambazar.controller.profile;

import com.shrambazar.dto.profile.WorkExperienceRequest;
import com.shrambazar.dto.profile.WorkExperienceResponse;
import com.shrambazar.service.profile.WorkExperienceService;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/seeker/experience")
public class WorkExperienceController {

    private final WorkExperienceService workExperienceService;

    public WorkExperienceController(WorkExperienceService workExperienceService) {
        this.workExperienceService = workExperienceService;
    }

    @GetMapping
    public ResponseEntity<List<WorkExperienceResponse>> getExperience() {
        return ResponseEntity.ok(
                workExperienceService.getMyExperience()
        );
    }

    @PostMapping
    public ResponseEntity<WorkExperienceResponse> addExperience(
            @Valid @RequestBody WorkExperienceRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(workExperienceService.addExperience(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<WorkExperienceResponse> updateExperience(
            @PathVariable Long id,
            @Valid @RequestBody WorkExperienceRequest request) {

        return ResponseEntity.ok(
                workExperienceService.updateExperience(id, request)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExperience(
            @PathVariable Long id) {

        workExperienceService.deleteExperience(id);
        return ResponseEntity.noContent().build();
    }
}
