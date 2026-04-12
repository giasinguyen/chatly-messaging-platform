package com.chatly.util;

import com.chatly.model.enums.ClientPlatform;
import org.springframework.util.StringUtils;

public final class ClientPlatformParser {

    private ClientPlatformParser() {
    }

    /** Header X-Client-Platform: web | mobile (default web). */
    public static ClientPlatform parse(String header) {
        if (!StringUtils.hasText(header)) {
            return ClientPlatform.WEB;
        }
        String v = header.trim().toLowerCase();
        if ("mobile".equals(v) || "app".equals(v) || "ios".equals(v) || "android".equals(v)) {
            return ClientPlatform.MOBILE;
        }
        return ClientPlatform.WEB;
    }
}
