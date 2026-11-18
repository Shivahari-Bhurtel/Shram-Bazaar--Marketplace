
package com.shrambazar.repository;

import com.shrambazar.entity.VerificationDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VerificationDocumentRepository
        extends JpaRepository<VerificationDocument, Long> {

    List<VerificationDocument> findByVerificationRequestId(
            Long verificationRequestId
    );

    Optional<VerificationDocument> findByIdAndVerificationRequestId(
            Long id,
            Long verificationRequestId
    );

    boolean existsByVerificationRequestIdAndDocumentType(
            Long verificationRequestId,
            com.shrambazar.enums.VerificationDocumentType documentType
    );
}
