
package com.shrambazar.controller.verification;

import com.shrambazar.dto.verification.*;
import com.shrambazar.enums.VerificationDocumentType;
import com.shrambazar.service.verification.VerificationService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/verifications")
public class VerificationController {

    private final VerificationService verificationService;


    public VerificationController(
            VerificationService verificationService) {
        this.verificationService = verificationService;
    }

    @PostMapping
    public ResponseEntity<VerificationRequestResponse> submitRequest(
            @Valid @RequestBody VerificationRequestCreate request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(verificationService.submitRequest(request));
    }

    @GetMapping("/me")
    public ResponseEntity<List<VerificationRequestResponse>> getMyRequests() {

        return ResponseEntity.ok(
                verificationService.getMyRequests()
        );
    }

    @PostMapping(
            value = "/{requestId}/documents",
            consumes = "multipart/form-data"
    )
    public ResponseEntity<VerificationDocumentResponse> uploadDocument(
            @PathVariable Long requestId,
            @RequestParam VerificationDocumentType documentType,
            @RequestParam("file") MultipartFile file) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(verificationService.uploadDocument(
                        requestId, documentType, file
                ));
    }
}
