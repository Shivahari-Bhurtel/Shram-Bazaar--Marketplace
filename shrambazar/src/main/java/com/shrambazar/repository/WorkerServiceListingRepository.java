package com.shrambazar.repository;
import com.shrambazar.entity.WorkerServiceListing;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface WorkerServiceListingRepository extends JpaRepository<WorkerServiceListing, Long> {
    List<WorkerServiceListing> findBySeekerProfileIdOrderByUpdatedAtDesc(Long profileId);
    List<WorkerServiceListing> findBySeekerProfileIdAndActiveTrue(Long profileId);
    boolean existsBySeekerProfileIdAndActiveTrue(Long profileId);
    Optional<WorkerServiceListing> findByIdAndSeekerProfileId(Long id, Long profileId);
    Optional<WorkerServiceListing> findFirstBySeekerProfileIdAndCategoryIgnoreCaseAndTitleIgnoreCase(Long profileId, String category, String title);
}
