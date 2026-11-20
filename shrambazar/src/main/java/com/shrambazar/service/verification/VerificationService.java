
package com.shrambazar.service.verification;

import com.shrambazar.dto.verification.*;
import com.shrambazar.entity.*;
import com.shrambazar.enums.*;
import com.shrambazar.repository.*;
import com.shrambazar.service.CurrentUserService;

import com.shrambazar.service.notification.NotificationService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class VerificationService {

    private final VerificationRequestRepository requestRepository;
    private final VerificationDocumentRepository documentRepository;
    private final VerificationFileStorageService storageService;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;
    private final ProviderProfileRepository providerProfileRepository;

    public VerificationService(
            VerificationRequestRepository requestRepository,
            VerificationDocumentRepository documentRepository,
            VerificationFileStorageService storageService,
            CurrentUserService currentUserService,
            NotificationService notificationService,
            ProviderProfileRepository providerProfileRepository) {

        this.requestRepository = requestRepository;
        this.documentRepository = documentRepository;
        this.storageService = storageService;
        this.currentUserService = currentUserService;
        this.notificationService = notificationService;
        this.providerProfileRepository = providerProfileRepository;
    }

    // User submits a verification request
    @Transactional
    public VerificationRequestResponse submitRequest(
            VerificationRequestCreate request) {

        User user = currentUserService.getCurrentUser();

        if (user.getRole() == UserRole.ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Administrators cannot submit verification requests"
            );
        }

        if (user.getRole() == UserRole.JOB_SEEKER) {

            if (request.type() != VerificationType.IDENTITY) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Job seekers can only request identity verification"
                );
            }

        } else if (user.getRole() == UserRole.JOB_PROVIDER) {

            ProviderProfile profile = providerProfileRepository
                    .findByUser_Id(user.getId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Provider profile not found"
                    ));

            VerificationType requiredType = profile.isHasBusiness()
                    ? VerificationType.BUSINESS
                    : VerificationType.IDENTITY;

            if (request.type() != requiredType) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Your account requires " + requiredType + " verification"
                );
            }
        } else {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Your role cannot submit verification requests"
            );
        }

        if (requestRepository.existsByUserIdAndTypeAndStatus(
                user.getId(),
                request.type(),
                VerificationStatus.PENDING)) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "A verification request of this type is already pending"
            );
        }

        VerificationRequest verificationRequest =
                new VerificationRequest();

        verificationRequest.setUser(user);
        verificationRequest.setType(request.type());
        verificationRequest.setStatus(VerificationStatus.PENDING);

        return mapToResponse(
                requestRepository.save(verificationRequest)
        );
    }

    private void validateCurrentVerificationType(VerificationRequest request) {

        User user = request.getUser();

        if (user.getRole() == UserRole.JOB_PROVIDER) {

            ProviderProfile profile = providerProfileRepository
                    .findByUser_Id(user.getId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Provider profile not found"
                    ));

            VerificationType requiredType = profile.isHasBusiness()
                    ? VerificationType.BUSINESS
                    : VerificationType.IDENTITY;

            if (request.getType() != requiredType) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Your provider type has changed. Submit the appropriate verification request."
                );
            }
        }
    }

    // User views their verification requests
    @Transactional(readOnly = true)
    public List<VerificationRequestResponse> getMyRequests() {

        User user = currentUserService.getCurrentUser();

        return requestRepository
                .findByUserIdOrderBySubmittedAtDesc(user.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // User uploads a document
    @Transactional
    public VerificationDocumentResponse uploadDocument(
            Long requestId,
            VerificationDocumentType documentType,
            MultipartFile file) {

        User user = currentUserService.getCurrentUser();

        VerificationRequest request =
                requestRepository.findByIdAndUserId(
                        requestId, user.getId()
                ).orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Verification request not found"
                        )
                );

        if (request.getStatus() != VerificationStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Documents can only be uploaded to pending requests"
            );
        }

        validateCurrentVerificationType(request);
        validateDocumentType(request.getType(), documentType);

        if (documentRepository
                .existsByVerificationRequestIdAndDocumentType(
                        requestId, documentType)) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This document type has already been uploaded"
            );
        }

        VerificationFileStorageService.StoredFile storedFile =
                storageService.store(file);

        VerificationDocument document =
                new VerificationDocument();

        document.setVerificationRequest(request);
        document.setDocumentType(documentType);
        document.setOriginalFileName(
                storedFile.originalFileName()
        );
        document.setStorageKey(storedFile.storageKey());
        document.setContentType(storedFile.contentType());
        document.setFileSizeBytes(storedFile.fileSizeBytes());

        return mapDocument(
                documentRepository.save(document)
        );
    }

    // Admin views verification requests
    @Transactional(readOnly = true)
    public List<VerificationRequestResponse> getAllRequests(
            VerificationStatus status) {

        requireAdmin();

        List<VerificationRequest> requests =
                status == null
                        ? requestRepository.findAll(
                        org.springframework.data.domain.Sort
                                .by(org.springframework.data.domain.Sort.Direction.ASC,
                                        "submittedAt")
                )
                        : requestRepository
                        .findByStatusOrderBySubmittedAtAsc(status);

        return requests.stream()
                .map(this::mapToResponse)
                .toList();
    }

    // Admin approves a request
    @Transactional
    public VerificationRequestResponse approveRequest(
            Long requestId,
            String note) {

        User admin = requireAdmin();
        VerificationRequest request = getPendingRequest(requestId);

        validateCurrentVerificationType(request);

        List<VerificationDocument> documents =
                documentRepository.findByVerificationRequestId(requestId);

        if (!hasRequiredDocuments(request, documents)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Required verification documents are missing"
            );
        }

        request.setStatus(VerificationStatus.APPROVED);
        request.setReviewedBy(admin);
        request.setReviewedAt(LocalDateTime.now());
        request.setReviewNote(note);

        notificationService.createNotification(
                request.getUser(),
                NotificationType.VERIFICATION_APPROVED,
                "Verification approved",
                "Your verification request has been approved.",
                "VERIFICATION",
                request.getId()
        );

        return mapToResponse(request);
    }

    // Admin rejects a request
    @Transactional
    public VerificationRequestResponse rejectRequest(
            Long requestId,
            String note) {

        User admin = requireAdmin();

        if (note == null || note.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Rejection reason is required"
            );
        }

        VerificationRequest request = getPendingRequest(requestId);

        request.setStatus(VerificationStatus.REJECTED);
        request.setReviewedBy(admin);
        request.setReviewedAt(LocalDateTime.now());
        request.setReviewNote(note.trim());

        notificationService.createNotification(
                request.getUser(),
                NotificationType.VERIFICATION_REJECTED,
                "Verification rejected",
                "Your verification request was rejected: "
                        + note.trim(),
                "VERIFICATION",
                request.getId()
        );

        return mapToResponse(request);
    }

    // Admin downloads a private verification document
    @Transactional(readOnly = true)
    public DocumentDownload getDocumentForAdmin(
            Long requestId,
            Long documentId) {

        requireAdmin();

        VerificationRequest request =
                requestRepository.findById(requestId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Verification request not found"
                                )
                        );

        VerificationDocument document =
                documentRepository
                        .findByIdAndVerificationRequestId(
                                documentId, request.getId()
                        ).orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Document not found"
                                )
                        );

        return new DocumentDownload(
                storageService.load(document.getStorageKey()),
                document.getContentType(),
                document.getOriginalFileName()
        );
    }

    private User requireAdmin() {

        User user = currentUserService.getCurrentUser();

        if (user.getRole() != UserRole.ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Administrator access required"
            );
        }

        return user;
    }

    private VerificationRequest getPendingRequest(Long id) {

        VerificationRequest request = requestRepository.findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Verification request not found"
                        )
                );

        if (request.getStatus() != VerificationStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This request has already been reviewed"
            );
        }

        return request;
    }

    private void validateDocumentType(
            VerificationType requestType,
            VerificationDocumentType documentType) {

        boolean valid =
                documentType == VerificationDocumentType.OTHER ||
                        (requestType == VerificationType.IDENTITY &&
                                (documentType == VerificationDocumentType.NID_FRONT ||
                                        documentType == VerificationDocumentType.NID_BACK ||
                                        documentType == VerificationDocumentType.CITIZENSHIP_FRONT ||
                                        documentType == VerificationDocumentType.CITIZENSHIP_BACK)) ||
                        (requestType == VerificationType.BUSINESS &&
                                (documentType == VerificationDocumentType.BUSINESS_REGISTRATION ||
                                        documentType == VerificationDocumentType.PAN_CERTIFICATE));

        if (!valid) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Document type does not match verification request"
            );
        }
    }

    private boolean hasRequiredDocuments(
            VerificationRequest request,
            List<VerificationDocument> documents) {

        if (request.getType() == VerificationType.IDENTITY) {

            boolean front = documents.stream().anyMatch(d ->
                    d.getDocumentType() == VerificationDocumentType.NID_FRONT ||
                            d.getDocumentType() == VerificationDocumentType.CITIZENSHIP_FRONT);

            boolean back = documents.stream().anyMatch(d ->
                    d.getDocumentType() == VerificationDocumentType.NID_BACK ||
                            d.getDocumentType() == VerificationDocumentType.CITIZENSHIP_BACK);

            return front && back;
        }

        return documents.stream().anyMatch(d ->
                d.getDocumentType() == VerificationDocumentType.BUSINESS_REGISTRATION ||
                        d.getDocumentType() == VerificationDocumentType.PAN_CERTIFICATE);
    }

    private VerificationRequestResponse mapToResponse(
            VerificationRequest request) {

        List<VerificationDocumentResponse> documents =
                documentRepository
                        .findByVerificationRequestId(request.getId())
                        .stream()
                        .map(this::mapDocument)
                        .toList();

        return new VerificationRequestResponse(
                request.getId(),
                request.getUser().getId(),
                request.getUser().getFullName(),
                request.getUser().getEmail(),
                request.getType(),
                request.getStatus(),
                request.getReviewNote(),
                request.getSubmittedAt(),
                request.getReviewedAt(),
                documents
        );
    }

    private VerificationDocumentResponse mapDocument(
            VerificationDocument document) {

        return new VerificationDocumentResponse(
                document.getId(),
                document.getDocumentType(),
                document.getOriginalFileName(),
                document.getContentType(),
                document.getFileSizeBytes(),
                document.getUploadedAt()
        );
    }

    public record DocumentDownload(
            Resource resource,
            String contentType,
            String originalFileName
    ) {
    }
}
