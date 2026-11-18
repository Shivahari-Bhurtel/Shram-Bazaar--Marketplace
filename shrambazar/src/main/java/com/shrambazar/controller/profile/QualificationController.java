
package com.shrambazar.controller.profile;

import com.shrambazar.dto.profile.QualificationRequest;
import com.shrambazar.dto.profile.QualificationResponse;
import com.shrambazar.service.profile.QualificationService;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/seeker/qualifications")
public class QualificationController {

    private final QualificationService qualificationService;

    public QualificationController(QualificationService qualificationService) {
        this.qualificationService = qualificationService;
    }

    @GetMapping
    public ResponseEntity<List<QualificationResponse>> getQualifications() {
        return ResponseEntity.ok(
                qualificationService.getMyQualifications()
        );
    }

    @PostMapping
    public ResponseEntity<QualificationResponse> addQualification(
            @Valid @RequestBody QualificationRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(qualificationService.addQualification(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<QualificationResponse> updateQualification(
            @PathVariable Long id,
            @Valid @RequestBody QualificationRequest request) {

        return ResponseEntity.ok(
                qualificationService.updateQualification(id, request)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteQualification(
            @PathVariable Long id) {

        qualificationService.deleteQualification(id);
        return ResponseEntity.noContent().build();
    }
}
