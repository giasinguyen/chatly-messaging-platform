package com.chatly.util;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.util.StringUtils;

public final class HttpRequestMeta {

    private static final String[] SINGLE_VALUE_IP_HEADERS = {
        "X-Real-IP",
        "CF-Connecting-IP",
        "True-Client-IP",
    };

    private HttpRequestMeta() {
    }

    /** Client IP for GeoIP / audit; uses proxy headers when the app sits behind a tunnel or load balancer. */
    public static String clientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(xf)) {
            String fromChain = IpAddressUtils.firstPublicOrFirstInForwardedFor(xf);
            if (StringUtils.hasText(fromChain)) {
                return fromChain;
            }
        }
        for (String name : SINGLE_VALUE_IP_HEADERS) {
            String raw = request.getHeader(name);
            if (!StringUtils.hasText(raw)) {
                continue;
            }
            String n = IpAddressUtils.normalizeIp(raw.trim());
            if (StringUtils.hasText(n)) {
                return n;
            }
        }
        return IpAddressUtils.normalizeIp(request.getRemoteAddr());
    }
}
