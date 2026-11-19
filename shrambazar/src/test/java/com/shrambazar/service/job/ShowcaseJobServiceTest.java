package com.shrambazar.service.job;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import com.shrambazar.entity.ShowcaseJob;
import com.shrambazar.repository.ShowcaseJobRepository;

import java.io.StringReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import static org.junit.jupiter.api.Assertions.*;

class ShowcaseJobServiceTest {
    @TempDir Path tempDir;

    @Test
    void csvReaderHandlesQuotedCommasAndEscapedQuotes() throws Exception {
        var rows = ShowcaseJobService.parseCsv(new StringReader(
                "title,company,location\r\n\"Designer, Senior\",\"A \"\"quoted\"\" Co\",\"Lalitpur, Nepal\"\r\n"));

        assertEquals(2, rows.size());
        assertEquals("Designer, Senior", rows.get(1).get(0));
        assertEquals("A \"quoted\" Co", rows.get(1).get(1));
        assertEquals("Lalitpur, Nepal", rows.get(1).get(2));
    }

    @Test
    void parsesPythonStyleListFieldsFromDataset() {
        assertEquals(java.util.List.of("Full Time", "Part Time"), ShowcaseJobService.parseList("['Full Time', 'Part Time']"));
        assertEquals(java.util.List.of(), ShowcaseJobService.parseList("[]"));
    }

    @Test
    void excludesNoticesWithoutExcludingProcurementEmployment() {
        assertTrue(ShowcaseJobService.isNonEmploymentListing("TENDER NOTICE - Supply of Equipment", "Development Project, Tender Notice, Bid"));
        assertTrue(ShowcaseJobService.isNonEmploymentListing("Request for Quotation", "Hospitality / Hotel"));
        assertFalse(ShowcaseJobService.isNonEmploymentListing("Procurement Officer", "Accounting / Finance"));
    }

    @Test
    void fingerprintIsRepeatableAndNormalized() {
        Map<String, String> first = Map.of("source", "MeroJob", "title", "Graphic Designer", "company", "Acme Co", "location", "Kathmandu", "posted_date", "2026-11-18");
        Map<String, String> same = Map.of("source", "merojob", "title", " GRAPHIC designer ", "company", "ACME CO", "location", "kathmandu", "posted_date", "2026-11-18");
        assertEquals(ShowcaseJobService.fingerprint(first), ShowcaseJobService.fingerprint(same));
    }

    @Test
    void csvImportIsIdempotentAndExcludesNotices() throws Exception {
        Path csv = tempDir.resolve("jobs.csv");
        Files.writeString(csv, "title,company,location,country,category,source,posted_date,salary_min\n"
                + "Graphic Designer,Acme,\"Kathmandu, Nepal\",Nepal,Creative,merojob,2026-11-18,50000\n"
                + "Graphic Designer,Acme,\"Kathmandu, Nepal\",Nepal,Creative,merojob,2026-11-18,50000\n"
                + "TENDER NOTICE,Agency,Kathmandu,Nepal,\"Expression of Interests, Tender Notice\",jobsnepal,,\n");

        ShowcaseJobRepository repository = mock(ShowcaseJobRepository.class);
        List<ShowcaseJob> persisted = new ArrayList<>();
        when(repository.findAll()).thenAnswer(call -> new ArrayList<>(persisted));
        when(repository.save(any(ShowcaseJob.class))).thenAnswer(call -> {
            ShowcaseJob saved = call.getArgument(0);
            persisted.add(saved);
            return saved;
        });
        ShowcaseJobService service = new ShowcaseJobService(repository);

        var firstRun = service.importCsv(csv);
        var secondRun = service.importCsv(csv);

        assertEquals(1, firstRun.inserted());
        assertEquals(1, firstRun.duplicatesSkipped());
        assertEquals(1, firstRun.nonEmploymentExcluded());
        assertEquals(0, secondRun.inserted());
        assertEquals(2, secondRun.duplicatesSkipped());
        assertEquals(1, secondRun.nonEmploymentExcluded());
        assertEquals(1, persisted.size());
        assertEquals(new BigDecimal("50000"), persisted.getFirst().getSalaryMin());
        verify(repository, times(1)).save(any(ShowcaseJob.class));
    }

    @Test
    void suppliedNepalSnapshotImportsExpectedEmploymentRowsAndRepeatsSafely() throws Exception {
        Path csv = Path.of("data/nepali_jobs.csv");
        assertTrue(Files.exists(csv), "Run this test from the shrambazar module directory");
        ShowcaseJobRepository repository = mock(ShowcaseJobRepository.class);
        List<ShowcaseJob> persisted = new ArrayList<>();
        when(repository.findAll()).thenAnswer(call -> new ArrayList<>(persisted));
        when(repository.save(any(ShowcaseJob.class))).thenAnswer(call -> {
            ShowcaseJob saved = call.getArgument(0);
            persisted.add(saved);
            return saved;
        });
        ShowcaseJobService service = new ShowcaseJobService(repository);

        var firstRun = service.importCsv(csv);
        var secondRun = service.importCsv(csv);

        assertEquals(414, firstRun.recordsRead());
        assertEquals(352, firstRun.inserted());
        assertEquals(0, firstRun.duplicatesSkipped());
        assertEquals(62, firstRun.nonEmploymentExcluded());
        assertEquals(0, firstRun.invalidSkipped());
        assertEquals(0, secondRun.inserted());
        assertEquals(352, secondRun.duplicatesSkipped());
        assertEquals(352, persisted.size());
        assertTrue(persisted.stream().allMatch(job -> job.getSourceUrl() == null));
    }

    @Test
    void searchAppliesLocationSourceAndNumericSalaryFilters() {
        ShowcaseJob listing = new ShowcaseJob();
        listing.setTitle("Graphic Designer");
        listing.setCompany("Acme");
        listing.setLocation("Kathmandu, Nepal");
        listing.setNormalizedLocation("kathmandu nepal");
        listing.setCategory("Creative / Graphics / Designing");
        listing.setJobTypeRaw("['Full Time']");
        listing.setSalaryMin(new BigDecimal("50000"));
        listing.setSalaryMax(new BigDecimal("70000"));
        listing.setSource("merojob");
        ShowcaseJobRepository repository = mock(ShowcaseJobRepository.class);
        when(repository.findAllByOrderByPostedDateDescTitleAsc()).thenReturn(List.of(listing));

        List<?> result = new ShowcaseJobService(repository).search("graphic", "kathmandu", "creative", "full time",
                new BigDecimal("60000"), new BigDecimal("80000"), "merojob");
        List<?> excludedBySalary = new ShowcaseJobService(repository).search(null, null, null, null,
                new BigDecimal("80001"), null, null);

        assertEquals(1, result.size());
        assertEquals(0, excludedBySalary.size());
    }
}
