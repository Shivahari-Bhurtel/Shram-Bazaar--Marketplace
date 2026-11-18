
package com.shrambazar.controller.availability;

import com.shrambazar.dto.availability.*;
import com.shrambazar.service.availability.AvailabilityService;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/seeker/availability")
public class AvailabilityController {

    private final AvailabilityService availabilityService;

    public AvailabilityController(AvailabilityService availabilityService) {
        this.availabilityService = availabilityService;
    }

    @GetMapping
    public ResponseEntity<List<AvailabilityResponse>> getAvailability() {

        return ResponseEntity.ok(
                availabilityService.getMyAvailability()
        );
    }

    @PostMapping
    public ResponseEntity<AvailabilityResponse> addAvailability(
            @Valid @RequestBody AvailabilityRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(availabilityService.addAvailability(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AvailabilityResponse> updateAvailability(
            @PathVariable Long id,
            @Valid @RequestBody AvailabilityRequest request) {

        return ResponseEntity.ok(
                availabilityService.updateAvailability(id, request)
        );
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<AvailabilityResponse> updateStatus(
            @PathVariable Long id,
            @RequestBody AvailabilityStatusRequest request) {

        return ResponseEntity.ok(
                availabilityService.updateAvailabilityStatus(id, request)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAvailability(
            @PathVariable Long id) {

        availabilityService.deleteAvailability(id);
        return ResponseEntity.noContent().build();
    }
}
