package com.shrambazar.controller.dashboard;

import com.shrambazar.dto.dashboard.ProviderAiMatchRequest;
import com.shrambazar.dto.dashboard.ProviderAiMatchResponse;
import com.shrambazar.service.dashboard.ProviderAiService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/provider/ai")
public class ProviderAiController {
    private final ProviderAiService providerAiService;

    public ProviderAiController(ProviderAiService providerAiService) {
        this.providerAiService = providerAiService;
    }

    @PostMapping("/matches")
    public ResponseEntity<ProviderAiMatchResponse> match(
            @Valid @RequestBody ProviderAiMatchRequest request
    ) {
        return ResponseEntity.ok(providerAiService.match(request));
    }
}
