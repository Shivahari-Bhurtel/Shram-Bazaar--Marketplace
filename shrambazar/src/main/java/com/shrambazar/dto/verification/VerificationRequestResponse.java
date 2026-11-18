
package com.shrambazar.dto.verification;

import com.shrambazar.enums.VerificationStatus;
import com.shrambazar.enums.VerificationType;

import java.time.LocalDateTime;
import java.util.List;

public record VerificationRequestResponse(

        Long id,
        Long userId,
        String fullName,
        String email,
        VerificationType type,
        VerificationStatus status,
        String reviewNote,
        LocalDateTime submittedAt,
        LocalDateTime reviewedAt,
        List<VerificationDocumentResponse> documents

) {
}
