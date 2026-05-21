package com.chatly.service;

import com.chatly.dto.request.UserSettingsRequest;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.model.mongo.MessageSettings;
import com.chatly.model.mongo.NotificationSettings;
import com.chatly.model.mongo.PrivacySettings;
import com.chatly.model.mongo.UserSettings;
import com.chatly.repository.mongo.UserSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserSettingsService {

    private final UserSettingsRepository userSettingsRepository;

    public UserSettings getOrCreateDefault(String userId) {
        return userSettingsRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserSettings defaults = UserSettings.builder()
                            .userId(userId)
                            .build();
                    return userSettingsRepository.save(defaults);
                });
    }

    public UserSettings update(String userId, UserSettingsRequest request) {
        UserSettings settings = getOrCreateDefault(userId);

        if (request.getPrivacy() != null) {
            settings.setPrivacy(request.getPrivacy());
        }
        if (request.getNotifications() != null) {
            settings.setNotifications(request.getNotifications());
        }
        if (request.getMessages() != null) {
            settings.setMessages(request.getMessages());
        }

        return userSettingsRepository.save(settings);
    }

    public UserSettings updateSection(String userId, String section, Map<String, Object> data) {
        UserSettings settings = getOrCreateDefault(userId);

        switch (section) {
            case "privacy" -> applyPrivacy(settings.getPrivacy(), data);
            case "notifications" -> applyNotifications(settings.getNotifications(), data);
            case "messages" -> applyMessages(settings.getMessages(), data);
            default -> throw new AppException(ErrorCode.SETTINGS_INVALID_SECTION);
        }

        return userSettingsRepository.save(settings);
    }

    private void applyPrivacy(PrivacySettings privacy, Map<String, Object> data) {
        if (data.containsKey("showOnlineStatus")) {
            privacy.setShowOnlineStatus((Boolean) data.get("showOnlineStatus"));
        }
        if (data.containsKey("showLastSeen")) {
            privacy.setShowLastSeen((Boolean) data.get("showLastSeen"));
        }
        if (data.containsKey("showReadReceipts")) {
            privacy.setShowReadReceipts((Boolean) data.get("showReadReceipts"));
        }
        if (data.containsKey("allowFriendRequests")) {
            privacy.setAllowFriendRequests((Boolean) data.get("allowFriendRequests"));
        }
        if (data.containsKey("showFriendList")) {
            privacy.setShowFriendList((Boolean) data.get("showFriendList"));
        }
    }

    private void applyNotifications(NotificationSettings notifications, Map<String, Object> data) {
        if (data.containsKey("messageSound")) {
            notifications.setMessageSound((Boolean) data.get("messageSound"));
        }
        if (data.containsKey("groupSound")) {
            notifications.setGroupSound((Boolean) data.get("groupSound"));
        }
        if (data.containsKey("callSound")) {
            notifications.setCallSound((Boolean) data.get("callSound"));
        }
        if (data.containsKey("showPreview")) {
            notifications.setShowPreview((Boolean) data.get("showPreview"));
        }
    }

    private void applyMessages(MessageSettings messages, Map<String, Object> data) {
        if (data.containsKey("enterToSend")) {
            messages.setEnterToSend((Boolean) data.get("enterToSend"));
        }
        if (data.containsKey("autoDownloadMedia")) {
            messages.setAutoDownloadMedia((Boolean) data.get("autoDownloadMedia"));
        }
        if (data.containsKey("fontSize")) {
            messages.setFontSize((String) data.get("fontSize"));
        }
    }
}
