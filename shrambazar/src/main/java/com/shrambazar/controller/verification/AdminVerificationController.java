
package com.shrambazar.controller.verification;

import com.shrambazar.dto.verification.VerificationRequestResponse;
import com.shrambazar.enums.VerificationStatus;
import com.shrambazar.service.verification.VerificationService;

import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/admin/verifications")
@PreAuthorize("hasRole('ADMIN')")
public class AdminVerificationController {

    private final VerificationService verificationService;

    public AdminVerificationController(
            VerificationService verificationService) {
        this.verificationService = verificationService;
    }

    @GetMapping
    public ResponseEntity<List<VerificationRequestResponse>> getRequests(
            @RequestParam(required = false) VerificationStatus status) {

        return ResponseEntity.ok(
                verificationService.getAllRequests(status)
        );
    }

    @PostMapping("/{requestId}/approve")
    public ResponseEntity<VerificationRequestResponse> approveRequest(
            @PathVariable Long requestId,
            @RequestParam(required = false) String note) {

        return ResponseEntity.ok(
                verificationService.approveRequest(requestId, note)
        );
    }

    @PostMapping("/{requestId}/reject")
    public ResponseEntity<VerificationRequestResponse> rejectRequest(
            @PathVariable Long requestId,
            @RequestParam String note) {

        return ResponseEntity.ok(
                verificationService.rejectRequest(requestId, note)
        );
    }

    @GetMapping("/{requestId}/documents/{documentId}")
    public ResponseEntity<Resource> downloadDocument(
            @PathVariable Long requestId,
            @PathVariable Long documentId) {

        VerificationService.DocumentDownload document =
                verificationService.getDocumentForAdmin(
                        requestId, documentId
                );

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(
                        document.contentType()
                ))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(
                                        document.originalFileName(),
                                        StandardCharsets.UTF_8
                                )
                                .build()
                                .toString()
                )
                .body(document.resource());
    }
}
