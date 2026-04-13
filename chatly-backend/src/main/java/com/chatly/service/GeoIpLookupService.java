package com.chatly.service;

import com.chatly.dto.geo.GeoIpResolution;
import com.chatly.util.IpAddressUtils;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Resolves client location from <a href="https://ipwho.is">ipwho.is</a> ({@code GET https://ipwho.is/{ip}}).
 * Stores the full JSON response in the DB; {@link GeoIpResolution#locationLabel()} is {@code city, region, country}
 * when available.
 * <p>
 * Caches successful resolutions per IP to reduce external calls and avoid null labels when the API is briefly flaky.
 */
@Service
@Slf4j
public class GeoIpLookupService {

    private static final int MAX_ATTEMPTS = 3;
    private static final long RETRY_DELAY_MS = 120L;
    private static final long CACHE_TTL_MS = 24L * 60 * 60 * 1000;

    private final ConcurrentHashMap<String, CachedResolution> positiveCache = new ConcurrentHashMap<>();

    private record CachedResolution(GeoIpResolution resolution, long expiresAtEpochMs) {}

    private final RestTemplate restTemplate = createRestTemplate();

    private static RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(4000);
        factory.setReadTimeout(4000);
        return new RestTemplate(factory);
    }

    @Value("${app.geoip.enabled:true}")
    private boolean enabled;

    /**
     * @return null for private/local IPs, disabled service, or when all lookups fail
     */
    public GeoIpResolution resolve(String ip) {
        if (!enabled || !StringUtils.hasText(ip)) {
            return null;
        }
        String normalized = IpAddressUtils.normalizeIp(ip.trim());
        if (!StringUtils.hasText(normalized) || IpAddressUtils.isLocalOrPrivate(normalized)) {
            return null;
        }
        CachedResolution cached = positiveCache.get(normalized);
        if (cached != null) {
            if (cached.expiresAtEpochMs > System.currentTimeMillis()) {
                return cached.resolution();
            }
            positiveCache.remove(normalized, cached);
        }
        String lastError = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            if (attempt > 1) {
                try {
                    Thread.sleep(RETRY_DELAY_MS * (attempt - 1));
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
            GeoIpResolution fromIpWho = lookupIpWhoIs(normalized);
            if (fromIpWho != null) {
                remember(normalized, fromIpWho);
                return fromIpWho;
            }
            String fallbackLabel = lookupIpApiLabelOnly(normalized);
            if (StringUtils.hasText(fallbackLabel)) {
                GeoIpResolution fb = new GeoIpResolution(fallbackLabel, null);
                remember(normalized, fb);
                return fb;
            }
            lastError = "attempt " + attempt + " ipwho + ip-api empty";
        }
        log.warn("GeoIP resolve exhausted retries for {} ({})", normalized, lastError);
        return null;
    }

    /** Backward-compatible: label only (used by code paths that do not need JSON). */
    public String summarizeLocation(String ip) {
        GeoIpResolution r = resolve(ip);
        return r != null ? r.locationLabel() : null;
    }

    private void remember(String normalizedIp, GeoIpResolution resolution) {
        positiveCache.put(normalizedIp, new CachedResolution(resolution, System.currentTimeMillis() + CACHE_TTL_MS));
    }

    private GeoIpResolution lookupIpWhoIs(String ipForApi) {
        try {
            JsonNode root = restTemplate.getForObject(
                "https://ipwho.is/" + ipForApi,
                JsonNode.class
            );
            if (root == null || !isTruthyNode(root.get("success"))) {
                return null;
            }
            String label = buildLabelFromIpWho(root);
            return new GeoIpResolution(label, root);
        } catch (Exception e) {
            log.debug("GeoIP (ipwho.is) failed for {}: {}", ipForApi, e.getMessage());
            return null;
        }
    }

    private String buildLabelFromIpWho(JsonNode n) {
        List<String> parts = new ArrayList<>(3);
        addIfPresent(parts, textOrEmpty(n.get("city")));
        addIfPresent(parts, textOrEmpty(n.get("region")));
        addIfPresent(parts, textOrEmpty(n.get("country")));
        if (!parts.isEmpty()) {
            return String.join(", ", parts);
        }
        String country = textOrEmpty(n.get("country"));
        return StringUtils.hasText(country) ? country : null;
    }

    private static void addIfPresent(List<String> parts, String s) {
        if (StringUtils.hasText(s)) {
            parts.add(s.trim());
        }
    }

    private static String textOrEmpty(JsonNode node) {
        if (node == null || node.isNull()) {
            return "";
        }
        String t = node.asText();
        return t != null ? t.trim() : "";
    }

    private static boolean isTruthyNode(JsonNode v) {
        if (v == null || v.isNull()) {
            return false;
        }
        if (v.isBoolean()) {
            return v.booleanValue();
        }
        return "true".equalsIgnoreCase(v.asText());
    }

    @SuppressWarnings("unchecked")
    private String lookupIpApiLabelOnly(String ipForApi) {
        try {
            Map<String, Object> body = restTemplate.getForObject(
                "http://ip-api.com/json/" + ipForApi + "?fields=status,message,country,city",
                Map.class
            );
            if (body == null || !"success".equals(body.get("status"))) {
                return null;
            }
            Object city = body.get("city");
            Object country = body.get("country");
            if (city != null && country != null) {
                return city + ", " + country;
            }
            if (country != null) {
                return country.toString();
            }
            return null;
        } catch (Exception e) {
            log.debug("GeoIP (ip-api fallback) failed for {}: {}", ipForApi, e.getMessage());
            return null;
        }
    }
}
