
package com.shrambazar.service.job;

import com.shrambazar.dto.job.SavedJobResponse;
import com.shrambazar.entity.*;
import com.shrambazar.enums.JobPostStatus;
import com.shrambazar.repository.*;
import com.shrambazar.service.CurrentUserService;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class SavedJobService {

    private final SavedJobRepository savedJobRepository;
    private final JobPostRepository jobPostRepository;
    private final CurrentUserService currentUserService;

    public SavedJobService(
            SavedJobRepository savedJobRepository,
            JobPostRepository jobPostRepository,
            CurrentUserService currentUserService) {

        this.savedJobRepository = savedJobRepository;
        this.jobPostRepository = jobPostRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<SavedJobResponse> getMySavedJobs() {

        SeekerProfile seeker =
                currentUserService.getCurrentSeekerProfile();

        return savedJobRepository
                .findBySeekerProfileIdOrderBySavedAtDesc(seeker.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public SavedJobResponse saveJob(Long jobId) {

        SeekerProfile seeker =
                currentUserService.getCurrentSeekerProfile();

        JobPost job = jobPostRepository.findById(jobId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Job not found"
                        )
                );

        if (job.getStatus() != JobPostStatus.OPEN) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Only open jobs can be saved"
            );
        }

        // PUT is idempotent: don't create duplicate saved records.
        return savedJobRepository
                .findBySeekerProfileIdAndJobPostId(
                        seeker.getId(), jobId
                )
                .map(this::mapToResponse)
                .orElseGet(() -> {

                    SavedJob savedJob = new SavedJob();
                    savedJob.setSeekerProfile(seeker);
                    savedJob.setJobPost(job);

                    return mapToResponse(
                            savedJobRepository.save(savedJob)
                    );
                });
    }

    @Transactional
    public void removeSavedJob(Long jobId) {

        SeekerProfile seeker =
                currentUserService.getCurrentSeekerProfile();

        SavedJob savedJob = savedJobRepository
                .findBySeekerProfileIdAndJobPostId(
                        seeker.getId(), jobId
                )
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Saved job not found"
                        )
                );

        savedJobRepository.delete(savedJob);
    }

    private SavedJobResponse mapToResponse(SavedJob savedJob) {

        JobPost job = savedJob.getJobPost();

        return new SavedJobResponse(
                savedJob.getId(),
                job.getId(),
                job.getTitle(),
                job.getAddress(),
                job.getDistrict(),
                job.getStartDate(),
                job.getEndDate(),
                job.getPaymentAmount(),
                job.getPaymentMethod(),
                savedJob.getSavedAt()
        );
    }
}
