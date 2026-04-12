package com.chatly.model.mongo;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrivacySettings {

    @Builder.Default
    private Boolean showOnlineStatus = true;

    @Builder.Default
    private Boolean showLastSeen = true;

    @Builder.Default
    private Boolean showReadReceipts = true;

    @Builder.Default
    private Boolean allowFriendRequests = true;
}
