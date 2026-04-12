package com.chatly.service;

import com.chatly.util.IpAddressUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Best-effort city/country from IP. Primary: ip-api.com (HTTP). Fallback: ipwho.is (HTTPS) when HTTP is blocked
 * or the primary API fails — avoids empty {@code location_label} for the same public IP across clients.
 */
@Service
@Slf4j
public class GeoIpLookupService {

    private static final int MAX_ATTEMPTS = 3;
    private static final long RETRY_DELAY_MS = 120L;

    private final RestTemplate restTemplate = createRestTemplate();

    private static RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2500);
        factory.setReadTimeout(2500);
        return new RestTemplate(factory);
    }

    @Value("${app.geoip.enabled:true}")
    private boolean enabled;

    public String summarizeLocation(String ip) {
        if (!enabled || !StringUtils.hasText(ip)) {
            return null;
        }
        String normalized = IpAddressUtils.normalizeIp(ip.trim());
        if (!StringUtils.hasText(normalized) || IpAddressUtils.isLocalOrPrivate(normalized)) {
            return null;
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
            String result = lookupIpApi(normalized);
            if (StringUtils.hasText(result)) {
                return result;
            }
            result = lookupIpWhoIs(normalized);
            if (StringUtils.hasText(result)) {
                return result;
            }
            lastError = "attempt " + attempt + " both providers empty";
        }
        log.warn("GeoIP lookup exhausted retries for {} ({})", normalized, lastError);
        return null;
    }

    @SuppressWarnings("unchecked")
    private String lookupIpApi(String ipForApi) {
        try {
            Map<String, Object> body = restTemplate.getForObject(
                "http://ip-api.com/json/" + ipForApi + "?fields=status,message,country,city",
                Map.class
            );
            if (body == null || !"success".equals(body.get("status"))) {
                if (body != null && body.get("message") != null) {
                    log.debug("GeoIP (ip-api) non-success for {}: {}", ipForApi, body.get("message"));
                }
                return null;
            }
            return formatCityCountry(body.get("city"), body.get("country"));
        } catch (Exception e) {
            log.debug("GeoIP (ip-api) failed for {}: {}", ipForApi, e.getMessage());
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private String lookupIpWhoIs(String ipForApi) {
        try {
            Map<String, Object> body = restTemplate.getForObject(
                "https://ipwho.is/" + ipForApi,
                Map.class
            );
            if (body == null || !Boolean.TRUE.equals(body.get("success"))) {
                return null;
            }
            return formatCityCountry(body.get("city"), body.get("country"));
        } catch (Exception e) {
            log.debug("GeoIP (ipwho.is) failed for {}: {}", ipForApi, e.getMessage());
            return null;
        }
    }

    private static String formatCityCountry(Object city, Object country) {
        if (city != null && country != null) {
            return city + ", " + country;
        }
        if (country != null) {
            return country.toString();
        }
        return null;
    }
}
