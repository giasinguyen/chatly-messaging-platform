package com.chatly.model.mongo;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageSettings {

    @Builder.Default
    private Boolean enterToSend = true;

    @Builder.Default
    private Boolean autoDownloadMedia = true;

    @Builder.Default
    private String fontSize = "medium";
}
