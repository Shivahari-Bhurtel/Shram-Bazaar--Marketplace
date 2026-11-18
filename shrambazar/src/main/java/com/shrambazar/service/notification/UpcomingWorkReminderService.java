package com.shrambazar.service.notification;

import com.shrambazar.entity.WorkerEngagement;
import com.shrambazar.enums.EngagementStatus;
import com.shrambazar.enums.NotificationType;
import com.shrambazar.repository.WorkerEngagementRepository;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
public class UpcomingWorkReminderService {

    private static final ZoneId NEPAL_ZONE =
            ZoneId.of("Asia/Kathmandu");

    private final WorkerEngagementRepository engagementRepository;
    private final NotificationService notificationService;

    public UpcomingWorkReminderService(
            WorkerEngagementRepository engagementRepository,
            NotificationService notificationService) {

        this.engagementRepository = engagementRepository;
        this.notificationService = notificationService;
    }

    @Scheduled(fixedRate = 900000)
    @Transactional
    public void sendUpcomingWorkReminders() {

        LocalDateTime now =
                LocalDateTime.now(NEPAL_ZONE);

        LocalDateTime from = now;
        LocalDateTime to = now.plusHours(24);

        List<WorkerEngagement> engagements =
                engagementRepository.findEngagementsForUpcomingReminder(
                        EngagementStatus.CONFIRMED,
                        from.toLocalDate(),
                        from.toLocalTime(),
                        to.toLocalDate(),
                        to.toLocalTime()
                );

        for (WorkerEngagement engagement : engagements) {

            var job = engagement.getApplication().getJobPost();

            notificationService.createNotification(
                    engagement.getApplication()
                            .getSeekerProfile().getUser(),
                    NotificationType.UPCOMING_WORK,
                    "Upcoming work reminder",
                    "Your work for \"" + job.getTitle()
                            + "\" is scheduled to start within approximately 24 hours.",
                    "WORKER_ENGAGEMENT",
                    engagement.getId()
            );

            engagement.setUpcomingWorkReminderSent(true);
        }
    }
}