package com.shrambazar.service.job;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.logging.Logger;

/** Imports the bundled showcase snapshot on startup; the fingerprint makes this idempotent. */
@Component
public class ShowcaseJobImportRunner implements ApplicationRunner {
    private static final Logger log = Logger.getLogger(ShowcaseJobImportRunner.class.getName());
    private final ShowcaseJobService service;
    private final String csvPath;

    public ShowcaseJobImportRunner(ShowcaseJobService service,
                                   @Value("${app.dataset.import-file}") String csvPath) {
        this.service = service;
        this.csvPath = csvPath;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        Path source = Path.of(csvPath);
        if (!Files.isRegularFile(source) && Files.isRegularFile(Path.of("shrambazar", "data", "nepali_jobs.csv"))) {
            source = Path.of("shrambazar", "data", "nepali_jobs.csv");
        }
        ClassPathResource bundledCsv = new ClassPathResource("data/nepali_jobs.csv");
        if (!Files.isRegularFile(source) && !bundledCsv.exists()) {
            log.warning("Showcase CSV not found at " + source.toAbsolutePath() + "; showcase jobs will be empty until SHOWCASE_JOBS_CSV is configured.");
            return;
        }
        ShowcaseJobService.ImportResult result = Files.isRegularFile(source)
                ? service.importCsv(source)
                : service.importCsv(bundledCsv.getInputStream());
        System.out.printf("Showcase CSV import: %d records read; %d inserted; %d duplicates skipped; %d non-employment records excluded; %d invalid records skipped.%n",
                result.recordsRead(), result.inserted(), result.duplicatesSkipped(), result.nonEmploymentExcluded(), result.invalidSkipped());
    }
}
