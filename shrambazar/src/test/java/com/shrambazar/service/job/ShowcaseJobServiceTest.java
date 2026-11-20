package com.shrambazar.service.job;

import com.shrambazar.entity.ShowcaseJob;
import com.shrambazar.repository.ShowcaseJobRepository;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

class ShowcaseJobServiceTest {
    @Test
    void suppliedDatasetReplacesShowcaseRowsWithEightyExactListings() throws Exception {
        ShowcaseJobRepository repository = mock(ShowcaseJobRepository.class);
        ShowcaseJobService service = new ShowcaseJobService(repository);
        Path dataset = Path.of("src/main/resources/data/jobs.json");

        var result = service.replaceWithDemoJson(Files.newInputStream(dataset));

        assertEquals(80, result.recordsRead());
        verify(repository).deleteAllInBatch();
        verify(repository).saveAll(argThat(jobs -> {
            java.util.List<ShowcaseJob> imported = new java.util.ArrayList<>();
            jobs.forEach(imported::add);
            if (imported.size() != 80) return false;
            ShowcaseJob first = imported.get(0);
            return "job-001".equals(first.getDatasetId())
                    && first.getDescription().length() > 100
                    && first.getMapLatitude() != null
                    && first.getMapLongitude() != null
                    && "approximate".equals(first.getLocationAccuracy())
                    && Boolean.TRUE.equals(first.getDemo())
                    && first.getRequirementsRaw().contains("basic")
                    && first.getSkillsRaw().contains("Brick");
        }));
    }

    @Test
    void invalidDatasetDoesNotDeleteExistingShowcaseRows() {
        ShowcaseJobRepository repository = mock(ShowcaseJobRepository.class);
        ShowcaseJobService service = new ShowcaseJobService(repository);

        assertThrows(java.io.IOException.class, () -> service.replaceWithDemoJson(
                new ByteArrayInputStream("[]".getBytes())));

        verify(repository, never()).deleteAllInBatch();
        verify(repository, never()).saveAll(anyList());
    }

    @Test
    void searchUsesDescriptionLocationCategoryAndSalaryFilters() {
        ShowcaseJob job = new ShowcaseJob();
        job.setDatasetId("job-001");
        job.setTitle("Mason (Rajmistri)");
        job.setCompany("Himal Nirman Sewa");
        job.setCategory("Construction & Skilled Trades");
        job.setLocation("New Baneshwor");
        job.setCity("Kathmandu");
        job.setNormalizedLocation("new baneshwor kathmandu");
        job.setAddress("Near Shantinagar Gate");
        job.setDescription("Lay bricks and concrete blocks at a residential site.");
        job.setExperience("2+ years of masonry experience");
        job.setSalaryMin(new BigDecimal("1500"));
        job.setSalaryMax(new BigDecimal("1900"));
        job.setSalaryType("daily");
        job.setJobTypeRaw("Daily wage");
        job.setSource("Shram Bazaar Demo Dataset");
        job.setDemo(true);

        ShowcaseJobRepository repository = mock(ShowcaseJobRepository.class);
        when(repository.findAllByOrderByPostedDateDescTitleAsc()).thenReturn(List.of(job));
        ShowcaseJobService service = new ShowcaseJobService(repository);

        var matches = service.search("residential", "Kathmandu", "Construction", "daily", new BigDecimal("1400"), new BigDecimal("2000"), null);
        var filtered = service.search("residential", null, null, null, new BigDecimal("2000"), null, null);

        assertEquals(1, matches.size());
        assertEquals("job-001", matches.getFirst().id());
        assertEquals(0, filtered.size());
    }
}
