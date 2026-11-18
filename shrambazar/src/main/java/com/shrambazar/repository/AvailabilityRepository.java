
package com.shrambazar.repository;

import com.shrambazar.entity.Availability;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AvailabilityRepository
        extends JpaRepository<Availability, Long> {

    List<Availability> findBySeekerProfileId(Long seekerProfileId);

    List<Availability>
    findBySeekerProfileIdAndActiveTrueOrderByStartDateAscStartTimeAsc(
            Long seekerProfileId
    );

    Optional<Availability> findByIdAndSeekerProfileId(
            Long id,
            Long seekerProfileId
    );
}
