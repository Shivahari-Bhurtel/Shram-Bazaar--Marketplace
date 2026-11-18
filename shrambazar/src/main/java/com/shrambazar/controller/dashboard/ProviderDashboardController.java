package com.shrambazar.controller.dashboard;

import com.shrambazar.dto.dashboard.ProviderDashboardResponse;
import com.shrambazar.service.dashboard.ProviderDashboardService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/provider")
public class ProviderDashboardController {

    private final ProviderDashboardService providerDashboardService;

    public ProviderDashboardController(
            ProviderDashboardService providerDashboardService
    ) {
        this.providerDashboardService = providerDashboardService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ProviderDashboardResponse> getDashboard() {

        ProviderDashboardResponse response =
                providerDashboardService.getDashboard();

        return ResponseEntity.ok(response);
    }
}
