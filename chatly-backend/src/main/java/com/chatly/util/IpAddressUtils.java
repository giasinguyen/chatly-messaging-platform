package com.chatly.util;

import org.springframework.util.StringUtils;

/**
 * Normalization and RFC1918 / common local ranges for client IP extraction and GeoIP gating.
 */
public final class IpAddressUtils {

    private IpAddressUtils() {
    }

    /**
     * Strip IPv4-mapped IPv6 prefix and brackets so private-range checks and GeoIP see a plain IPv4 when applicable.
     */
    public static String normalizeIp(String ip) {
        if (ip == null) {
            return "";
        }
        String t = ip.trim();
        if (t.startsWith("[") && t.endsWith("]") && t.length() > 2) {
            t = t.substring(1, t.length() - 1);
        }
        if (t.startsWith("::ffff:")) {
            t = t.substring(7);
        }
        return t;
    }

    public static boolean isLocalOrPrivate(String ip) {
        if (!StringUtils.hasText(ip)) {
            return true;
        }
        if ("127.0.0.1".equals(ip) || "::1".equals(ip) || "0:0:0:0:0:0:0:1".equals(ip)) {
            return true;
        }
        if (ip.startsWith("10.")) {
            return true;
        }
        if (ip.startsWith("192.168.")) {
            return true;
        }
        if (ip.startsWith("172.")) {
            int secondDot = ip.indexOf('.', 4);
            if (secondDot > 4) {
                try {
                    int secondOctet = Integer.parseInt(ip.substring(4, secondDot));
                    return secondOctet >= 16 && secondOctet <= 31;
                } catch (NumberFormatException e) {
                    return false;
                }
            }
        }
        if (ip.contains(":")) {
            String lower = ip.toLowerCase();
            return lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd");
        }
        return false;
    }

    /**
     * Prefer the first publicly routable address in an X-Forwarded-For list (left-to-right).
     * If the chain is only private hops (misconfigured proxy), returns the first non-empty hop for audit.
     */
    public static String firstPublicOrFirstInForwardedFor(String xForwardedFor) {
        if (!StringUtils.hasText(xForwardedFor)) {
            return "";
        }
        String firstNonEmpty = "";
        for (String part : xForwardedFor.split(",")) {
            String n = normalizeIp(part);
            if (!StringUtils.hasText(n)) {
                continue;
            }
            if (firstNonEmpty.isEmpty()) {
                firstNonEmpty = n;
            }
            if (!isLocalOrPrivate(n)) {
                return n;
            }
        }
        return firstNonEmpty;
    }
}
