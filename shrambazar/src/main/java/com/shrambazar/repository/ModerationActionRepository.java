
package com.shrambazar.repository;

import com.shrambazar.entity.ModerationAction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ModerationActionRepository
        extends JpaRepository<ModerationAction, Long> {

    List<ModerationAction> findByReportIdOrderByCreatedAtDesc(
            Long reportId
    );

    List<ModerationAction> findByAdminIdOrderByCreatedAtDesc(
            Long adminId
    );
}
