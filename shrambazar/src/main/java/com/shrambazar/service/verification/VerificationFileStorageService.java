
package com.shrambazar.service.verification;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@Service
public class VerificationFileStorageService {

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;

    private final Path storageRoot;

    public VerificationFileStorageService(
            @Value("${app.storage.verification-dir:./private-storage/verification}")
            String storageDirectory) {

        this.storageRoot = Paths.get(storageDirectory)
                .toAbsolutePath()
                .normalize();
    }

    public StoredFile store(MultipartFile file) {

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Document is required"
            );
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Maximum document size is 5 MB"
            );
        }

        try {
            byte[] bytes = file.getBytes();

            String contentType = detectContentType(bytes);

            String extension = switch (contentType) {
                case "application/pdf" -> ".pdf";
                case "image/png" -> ".png";
                case "image/jpeg" -> ".jpg";
                default -> throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Unsupported document format"
                );
            };

            String storageKey = UUID.randomUUID() + extension;

            Files.createDirectories(storageRoot);

            Path target = storageRoot.resolve(storageKey).normalize();

            if (!target.startsWith(storageRoot)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Invalid storage path"
                );
            }

            Files.write(
                    target,
                    bytes,
                    StandardOpenOption.CREATE_NEW
            );

            String originalName = file.getOriginalFilename();

            if (originalName == null || originalName.isBlank()) {
                originalName = "document" + extension;
            }

            originalName = originalName.replace("\\", "/");
            originalName = originalName.substring(
                    originalName.lastIndexOf('/') + 1
            );

            if (originalName.length() > 255) {
                originalName = originalName.substring(0, 255);
            }

            return new StoredFile(
                    storageKey,
                    originalName,
                    contentType,
                    (long) bytes.length
            );

        } catch (IOException e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Unable to store verification document"
            );
        }
    }

    public Resource load(String storageKey) {

        if (storageKey == null ||
                !storageKey.matches(
                        "[0-9a-fA-F-]{36}\\.(pdf|png|jpg)"
                )) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Document not found"
            );
        }

        Path file = storageRoot.resolve(storageKey).normalize();

        if (!file.startsWith(storageRoot) ||
                !Files.isRegularFile(file)) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Document not found"
            );
        }

        return new FileSystemResource(file);
    }

    private String detectContentType(byte[] bytes) {

        if (bytes.length >= 5 &&
                bytes[0] == '%' &&
                bytes[1] == 'P' &&
                bytes[2] == 'D' &&
                bytes[3] == 'F' &&
                bytes[4] == '-') {

            return "application/pdf";
        }

        if (bytes.length >= 8 &&
                (bytes[0] & 0xFF) == 0x89 &&
                bytes[1] == 0x50 &&
                bytes[2] == 0x4E &&
                bytes[3] == 0x47 &&
                bytes[4] == 0x0D &&
                bytes[5] == 0x0A &&
                bytes[6] == 0x1A &&
                bytes[7] == 0x0A) {

            return "image/png";
        }

        if (bytes.length >= 3 &&
                (bytes[0] & 0xFF) == 0xFF &&
                (bytes[1] & 0xFF) == 0xD8 &&
                (bytes[2] & 0xFF) == 0xFF) {

            return "image/jpeg";
        }

        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Only PDF, PNG, and JPEG documents are allowed"
        );
    }

    public record StoredFile(
            String storageKey,
            String originalFileName,
            String contentType,
            Long fileSizeBytes
    ) {
    }
}
