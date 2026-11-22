package com.shrambazar.service.dashboard;

import com.shrambazar.dto.dashboard.ProviderAiMatchRequest;
import com.shrambazar.dto.dashboard.WorkerSearchRequest;
import com.shrambazar.dto.dashboard.WorkerSearchResponse;
import com.shrambazar.service.job.JobPostService;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ProviderAiServiceTest {
    @Test
    void electricianSearchMatchesElectricalMaintenanceWorkerFromAuthenticatedSearch() {
        JobPostService jobs = mock(JobPostService.class);
        WorkerSearchService workerSearch = mock(WorkerSearchService.class);
        WorkerSearchResponse worker = new WorkerSearchResponse(
                12L, 34L, "Worker One", null, null, "Kathmandu", null,
                List.of("Electrical maintenance"), List.of(), List.of(), 3.0,
                false, 4.5, 2, List.of());
        when(jobs.getMyJobs()).thenReturn(List.of());
        when(workerSearch.searchWorkers(any(WorkerSearchRequest.class))).thenReturn(List.of(worker));

        var response = new ProviderAiService(jobs, workerSearch).match(
                new ProviderAiMatchRequest("Find an electrician", null, List.of()));

        assertEquals(1, response.candidates().size());
        assertEquals(34L, response.candidates().getFirst().worker().getUserId());
        assertEquals(100, response.candidates().getFirst().matchScore());
        verify(workerSearch).searchWorkers(any(WorkerSearchRequest.class));
    }
}
