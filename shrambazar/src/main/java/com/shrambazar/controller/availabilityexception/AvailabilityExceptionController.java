
package com.shrambazar.controller.availabilityexception;

import com.shrambazar.dto.availabilityexception.AvailabilityExceptionRequest;
import com.shrambazar.dto.availabilityexception.AvailabilityExceptionResponse;
import com.shrambazar.service.applicationexception.AvailabilityExceptionService;

import jakarta.validation.Valid;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/seeker/availability-exceptions")
public class AvailabilityExceptionController {

    private final AvailabilityExceptionService exceptionService;

    public AvailabilityExceptionController(
            AvailabilityExceptionService exceptionService
    ) {
        this.exceptionService = exceptionService;
    }

    // Get exceptions within a date range
    @GetMapping
    public List<AvailabilityExceptionResponse> getMyExceptions(
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate startDate,

            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate endDate
    ) {
        return exceptionService.getMyExceptions(startDate, endDate);
    }

    // Add an unavailable time slot
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AvailabilityExceptionResponse addException(
            @Valid @RequestBody AvailabilityExceptionRequest request
    ) {
        return exceptionService.addException(request);
    }

    // Update an unavailable time slot
    @PutMapping("/{id}")
    public AvailabilityExceptionResponse updateException(
            @PathVariable Long id,
            @Valid @RequestBody AvailabilityExceptionRequest request
    ) {
        return exceptionService.updateException(id, request);
    }

    // Delete an unavailable time slot
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteException(@PathVariable Long id) {
        exceptionService.deleteException(id);
    }
}
