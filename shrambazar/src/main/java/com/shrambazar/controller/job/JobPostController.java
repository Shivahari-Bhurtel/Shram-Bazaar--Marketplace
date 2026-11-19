
package com.shrambazar.controller.job;

import com.shrambazar.dto.job.JobPostRequest;
import com.shrambazar.dto.job.JobPostResponse;
import com.shrambazar.dto.job.ShowcaseJobResponse;
import com.shrambazar.service.job.JobPostService;
import com.shrambazar.service.job.ShowcaseJobService;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api")
public class JobPostController {

    private final JobPostService jobPostService;
    private final ShowcaseJobService showcaseJobService;

    public JobPostController(JobPostService jobPostService, ShowcaseJobService showcaseJobService) {
        this.jobPostService = jobPostService;
        this.showcaseJobService = showcaseJobService;
    }

    // Provider creates a job
    @PostMapping("/provider/jobs")
    public ResponseEntity<JobPostResponse> createJob(
            @Valid @RequestBody JobPostRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(jobPostService.createJob(request));
    }

    // Provider views own jobs
    @GetMapping("/provider/jobs")
    public ResponseEntity<List<JobPostResponse>> getMyJobs() {

        return ResponseEntity.ok(jobPostService.getMyJobs());
    }

    // Provider updates own job
    @PutMapping("/provider/jobs/{jobId}")
    public ResponseEntity<JobPostResponse> updateJob(
            @PathVariable Long jobId,
            @Valid @RequestBody JobPostRequest request) {

        return ResponseEntity.ok(
                jobPostService.updateJob(jobId, request)
        );
    }

    // Provider closes a job
    @PostMapping("/provider/jobs/{jobId}/close")
    public ResponseEntity<Void> closeJob(
            @PathVariable Long jobId) {

        jobPostService.closeJob(jobId);
        return ResponseEntity.noContent().build();
    }

    // Provider cancels a job
    @PostMapping("/provider/jobs/{jobId}/cancel")
    public ResponseEntity<Void> cancelJob(
            @PathVariable Long jobId) {

        jobPostService.cancelJob(jobId);
        return ResponseEntity.noContent().build();
    }

    // Public job browsing and filtering
    @GetMapping("/jobs")
    public ResponseEntity<List<JobPostResponse>> searchJobs(

            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) BigDecimal minPayment,
            @RequestParam(required = false) BigDecimal maxPayment,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate workDate) {

        return ResponseEntity.ok(
                jobPostService.searchJobs(
                        keyword,
                        district,
                        minPayment,
                        maxPayment,
                        workDate
                )
        );
    }

    // Public job details
    @GetMapping("/jobs/showcase")
    public ResponseEntity<List<ShowcaseJobResponse>> searchShowcaseJobs(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String jobType,
            @RequestParam(required = false) BigDecimal minSalary,
            @RequestParam(required = false) BigDecimal maxSalary,
            @RequestParam(required = false) String source) {
        return ResponseEntity.ok(showcaseJobService.search(keyword, location, category, jobType, minSalary, maxSalary, source));
    }

    // Public job details
    @GetMapping("/jobs/{jobId}")
    public ResponseEntity<JobPostResponse> getJob(
            @PathVariable Long jobId) {

        return ResponseEntity.ok(
                jobPostService.getPublicJob(jobId)
        );
    }

    // Provider views active jobs with pagination
    @GetMapping("/provider/jobs/active")
    public ResponseEntity<Page<JobPostResponse>> getMyActiveJobs(
            @RequestParam(defaultValue = "0") int page) {

        return ResponseEntity.ok(
                jobPostService.getMyActiveJobs(page)
        );
    }


}
