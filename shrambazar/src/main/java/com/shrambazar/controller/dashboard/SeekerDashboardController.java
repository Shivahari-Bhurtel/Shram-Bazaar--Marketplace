package com.shrambazar.controller.dashboard;

import com.shrambazar.dto.dashboard.RecommendedJobResponse;
import com.shrambazar.service.dashboard.SeekerDashboardService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/seeker")
public class SeekerDashboardController {

    private final SeekerDashboardService seekerDashboardService;

    public SeekerDashboardController(
            SeekerDashboardService seekerDashboardService
    ) {
        this.seekerDashboardService = seekerDashboardService;
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('JOB_SEEKER')")
    public List<RecommendedJobResponse> getDashboard() {
        return seekerDashboardService.getDashboard();
    }
}