package com.chatly.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtProvider {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-ms}")
    private long jwtExpirationMs;

    @Value("${app.jwt.refresh-expiration-ms}")
    private long refreshExpirationMs;

    public String generateAccessToken(String userId, String sessionId, String role) {
        return buildToken(userId, sessionId, role, jwtExpirationMs);
    }

    public String generateRefreshToken(String userId, String sessionId, String role) {
        return buildToken(userId, sessionId, role, refreshExpirationMs);
    }

    public String getUserIdFromToken(String token) {
        return parseClaims(token).getSubject();
    }

    /** JWT ID claim (session id). Empty if legacy token without jti. */
    public String getSessionIdFromToken(String token) {
        try {
            String id = parseClaims(token).getId();
            return StringUtils.hasText(id) ? id : null;
        } catch (Exception e) {
            return null;
        }
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public long getExpirationTimeInSeconds(String token) {
        try {
            Claims claims = parseClaims(token);
            Date expiration = claims.getExpiration();
            Date now = new Date();
            long diffInMillis = expiration.getTime() - now.getTime();
            return Math.max(0, diffInMillis / 1000);
        } catch (Exception e) {
            return 0;
        }
    }

    public Date getIssuedAt(String token) {
        return parseClaims(token).getIssuedAt();
    }

    private String buildToken(String userId, String sessionId, String role, long expirationMs) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
            .id(sessionId)
            .subject(userId)
            .claim("role", role)
            .issuedAt(now)
            .expiration(expiry)
            .signWith(getSigningKey())
            .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
            .verifyWith(getSigningKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
