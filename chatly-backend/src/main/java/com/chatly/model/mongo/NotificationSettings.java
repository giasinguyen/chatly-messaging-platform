package com.chatly.model.mongo;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationSettings {

    @Builder.Default
    private Boolean messageSound = true;

    @Builder.Default
    private Boolean groupSound = true;

    @Builder.Default
    private Boolean callSound = true;

    @Builder.Default
    private Boolean showPreview = true;
}
