
package com.shrambazar.service.profile;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;

@Service
public class ProfilePictureService {

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private final Path storageDirectory;

    public ProfilePictureService(
            @Value("${app.storage.profile-picture-dir}")
            String storageDirectory
    ) {
        this.storageDirectory = Paths.get(storageDirectory)
                .toAbsolutePath()
                .normalize();

        try {
            Files.createDirectories(this.storageDirectory);
        } catch (IOException e) {
            throw new IllegalStateException(
                    "Could not initialize profile picture storage.", e
            );
        }
    }

    public String uploadProfilePicture(MultipartFile file) {

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Please select a profile picture."
            );
        }

        validateImage(file);

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Profile picture must not exceed 5 MB."
            );
        }

        String contentType = file.getContentType();

        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Only JPG, PNG and WebP images are allowed."
            );
        }

        String extension = switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unsupported image format."
            );
        };

        String filename = UUID.randomUUID() + extension;

        Path targetPath = storageDirectory.resolve(filename).normalize();

        if (!targetPath.startsWith(storageDirectory)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid file path."
            );
        }

        try {
            Files.copy(file.getInputStream(), targetPath);
        } catch (IOException e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Could not save profile picture."
            );
        }

        return "/uploads/profile-pictures/" + filename;
    }

    public void deleteProfilePicture(String pictureUrl) {

        if (pictureUrl == null || pictureUrl.isBlank()) {
            return;
        }

        String filename = Paths.get(pictureUrl)
                .getFileName()
                .toString();

        Path filePath = storageDirectory.resolve(filename).normalize();

        if (!filePath.startsWith(storageDirectory)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid file path."
            );
        }

        try {
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Could not delete profile picture."
            );
        }
    }

    private void validateImage(MultipartFile file) {
        try {
            BufferedImage image = ImageIO.read(file.getInputStream());

            if (image == null) {
                throw new IllegalArgumentException("Invalid image file.");
            }

            int width = image.getWidth();
            int height = image.getHeight();

            if (width > 6000 || height > 6000 ||
                    (long) width * height > 25_000_000) {
                throw new IllegalArgumentException("Image dimensions are too large.");
            }

        } catch (IOException e) {
            throw new IllegalArgumentException("Could not read image file.");
        }
    }
}
