
package com.shrambazar.repository;

import com.shrambazar.entity.AvailabilityException;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AvailabilityExceptionRepository
        extends JpaRepository<AvailabilityException, Long> {

    List<AvailabilityException>
    findBySeekerProfileIdAndExceptionDateBetweenOrderByExceptionDateAscStartTimeAsc(
            Long seekerProfileId,
            LocalDate startDate,
            LocalDate endDate
    );

    Optional<AvailabilityException>
    findByIdAndSeekerProfileId(
            Long id,
            Long seekerProfileId
    );
}
