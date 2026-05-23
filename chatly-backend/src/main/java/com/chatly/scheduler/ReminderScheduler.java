package com.chatly.scheduler;

import com.chatly.model.mongo.GroupReminder;
import com.chatly.repository.mongo.GroupReminderRepository;
import com.chatly.service.MessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReminderScheduler {

    private final GroupReminderRepository groupReminderRepository;
    private final MessageService messageService;

    private static final DateTimeFormatter VN_FORMATTER =
            DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy").withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    /**
     * Every 30 seconds, check for due reminders and send a SYSTEM message to the group.
     */
    @Scheduled(fixedRate = 30_000)
    public void checkDueReminders() {
        Instant now = Instant.now();
        List<GroupReminder> dueReminders =
                groupReminderRepository.findByRemindAtBeforeAndCompletedFalseAndNotifiedFalse(now);

        for (GroupReminder reminder : dueReminders) {
            try {
                String timeStr = VN_FORMATTER.format(reminder.getRemindAt());
                String content = "⏰ Reminder: " + reminder.getTitle()
                        + (reminder.getDescription() != null ? " — " + reminder.getDescription() : "")
                        + " (Scheduled: " + timeStr + ")";

                messageService.sendSystemMessage(reminder.getConversationId(), content);

                reminder.setNotified(true);
                groupReminderRepository.save(reminder);

                log.info("Sent reminder notification for reminder {} in conversation {}",
                        reminder.getId(), reminder.getConversationId());
            } catch (Exception e) {
                log.error("Failed to send reminder notification for reminder {}: {}",
                        reminder.getId(), e.getMessage());
            }
        }
    }

    /**
     * Every hour, clean up completed reminders that have already passed their remindAt time.
     */
    @Scheduled(fixedRate = 3_600_000)
    public void cleanupExpiredReminders() {
        Instant now = Instant.now();
        List<GroupReminder> expired = groupReminderRepository.findByRemindAtBeforeAndCompletedTrue(now);
        if (!expired.isEmpty()) {
            groupReminderRepository.deleteAll(expired);
            log.info("Cleaned up {} expired reminders", expired.size());
        }
    }
}
