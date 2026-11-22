package com.shrambazar.dto.dashboard;

import com.shrambazar.dto.job.JobPostResponse;
import java.util.List;

public record ProviderAiMatchResponse(
        List<JobPostResponse> jobs,
        JobPostResponse selectedJob,
        boolean needsJobSelection,
        List<ProviderAiCandidate> candidates
) {}
