package com.shrambazar.controller.service;

import com.shrambazar.dto.service.WorkerServiceRequest;
import com.shrambazar.dto.service.WorkerServiceResponse;
import com.shrambazar.service.service.WorkerServiceListingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/seeker/services")
public class WorkerServiceListingController {
    private final WorkerServiceListingService service;
    public WorkerServiceListingController(WorkerServiceListingService service) { this.service = service; }
    @GetMapping public List<WorkerServiceResponse> mine() { return service.getMine(); }
    @PostMapping public ResponseEntity<WorkerServiceResponse> create(@Valid @RequestBody WorkerServiceRequest request) { return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request)); }
    @PutMapping("/{id}") public WorkerServiceResponse update(@PathVariable Long id, @Valid @RequestBody WorkerServiceRequest request) { return service.update(id, request); }
    @DeleteMapping("/{id}") public ResponseEntity<Void> delete(@PathVariable Long id) { service.delete(id); return ResponseEntity.noContent().build(); }
}
