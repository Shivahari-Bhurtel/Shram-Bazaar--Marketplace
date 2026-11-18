package com.shrambazar.controller.dashboard;

import com.shrambazar.dto.dashboard.WorkerSearchRequest;
import com.shrambazar.dto.dashboard.WorkerSearchResponse;
import com.shrambazar.service.dashboard.WorkerSearchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/provider/workers")
public class WorkerSearchController {

    private final WorkerSearchService workerSearchService;

    public WorkerSearchController(
            WorkerSearchService workerSearchService
    ) {
        this.workerSearchService = workerSearchService;
    }

    @GetMapping("/search")
    public ResponseEntity<List<WorkerSearchResponse>> searchWorkers(
            @ModelAttribute WorkerSearchRequest request
    ) {
        return ResponseEntity.ok(
                workerSearchService.searchWorkers(request)
        );
    }
}