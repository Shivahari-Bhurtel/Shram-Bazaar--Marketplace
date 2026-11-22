package com.shrambazar.dto.dashboard;

import java.util.List;

public record ProviderAiCandidate(
        WorkerSearchResponse worker,
        Integer matchScore,
        List<String> matchReasons
) {}
