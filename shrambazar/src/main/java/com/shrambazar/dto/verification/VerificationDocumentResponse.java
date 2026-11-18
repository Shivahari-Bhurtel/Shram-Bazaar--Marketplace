
package com.shrambazar.dto.verification;

import com.shrambazar.enums.VerificationDocumentType;
import java.time.LocalDateTime;

public record VerificationDocumentResponse(

        Long id,
        VerificationDocumentType documentType,
        String originalFileName,
        String contentType,
        Long fileSizeBytes,
        LocalDateTime uploadedAt

) {
}
