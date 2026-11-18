
package com.shrambazar.repository;

import com.shrambazar.entity.SeekerProfile;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface SeekerProfileRepository
        extends JpaRepository<SeekerProfile, Long> {

    Optional<SeekerProfile> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM SeekerProfile s WHERE s.id = :id")
    Optional<SeekerProfile> findByIdForUpdate(@Param("id") Long id);
}
