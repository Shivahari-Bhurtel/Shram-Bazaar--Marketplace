
package com.shrambazar.repository;

import com.shrambazar.entity.Notification;
import org.springframework.data.jpa.repository.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.repository.query.Param;

public interface NotificationRepository
        extends JpaRepository<Notification, Long> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(
            Long userId
    );

    List<Notification> findByUserIdAndReadFalseOrderByCreatedAtDesc(
            Long userId
    );

    Optional<Notification> findByIdAndUserId(
            Long id,
            Long userId
    );

    @Query("select count(n) from Notification n where n.user.id = :userId and n.read = false")
    long countByUserIdAndReadFalse(@Param("userId") Long userId);

    @Modifying
    @Query("""
        UPDATE Notification n
        SET n.read = true, n.readAt = :readAt
        WHERE n.user.id = :userId AND n.read = false
        """)
    int markAllAsRead(
            @Param("userId") Long userId,
            @Param("readAt") LocalDateTime readAt
    );
}
