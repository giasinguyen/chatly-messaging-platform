package com.chatly.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.agora")
public class AgoraProperties {

    private String appId;
    private String appCertificate;
    private int tokenTtlSeconds = 3600;
}
