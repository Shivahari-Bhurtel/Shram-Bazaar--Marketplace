package com.shrambazar.service.job;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.io.InputStream;
import java.util.logging.Logger;

/** Replaces the imported showcase table with the canonical simulated jobs snapshot. */
@Component
@ConditionalOnProperty(name = "app.dataset.import-enabled", havingValue = "true", matchIfMissing = true)
public class ShowcaseJobImportRunner implements ApplicationRunner {
    private static final Logger log = Logger.getLogger(ShowcaseJobImportRunner.class.getName());
    private final ShowcaseJobService service;
    private final String jsonPath;

    public ShowcaseJobImportRunner(ShowcaseJobService service,
                                   @Value("${app.dataset.import-file:data/jobs.json}") String jsonPath) {
        this.service = service;
        this.jsonPath = jsonPath;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        Path source = Path.of(jsonPath);
        ClassPathResource bundledJson = new ClassPathResource("data/jobs.json");
        if (!Files.isRegularFile(source) && !bundledJson.exists()) {
            log.warning("Demo jobs JSON not found at " + source.toAbsolutePath() + "; imported showcase listings will be empty.");
            return;
        }
        ShowcaseJobService.ImportResult result;
        try (InputStream input = Files.isRegularFile(source) ? Files.newInputStream(source) : bundledJson.getInputStream()) {
            result = service.replaceWithDemoJson(input);
        }
        System.out.printf("Demo jobs import: %d records validated and replaced.%n", result.recordsRead());
    }
}
