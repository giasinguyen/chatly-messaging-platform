package com.chatly.config;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import java.io.IOException;

/*
 * Handles all datetime string variants returned by Python/Pydantic:
 * 2026-04-09T08:32:06.773000Z          → Instant via OffsetDateTime
 * 2026-04-09T08:32:06.773000+00:00     → Instant via OffsetDateTime
 * 2026-04-09T08:32:06.773000           → assume UTC, parse as LocalDateTime
 * 2026-03-08                           → converted to 2026-03-08T00:00:00Z
 */
public class CustomInstantDeserializer extends JsonDeserializer<Instant> {
    @Override
    public Instant deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        try {
            String text = p.getValueAsString();
            if (text == null || text.isBlank())
                return null;

            if (text.contains("T")) {
                try {
                    // Handles Z, +00:00, -05:00 etc.
                    return OffsetDateTime.parse(text).toInstant();
                } catch (Exception e) {
                    // No timezone offset — treat as UTC
                    return LocalDateTime.parse(text).toInstant(ZoneOffset.UTC);
                }
            }

            return LocalDate.parse(text).atStartOfDay(ZoneOffset.UTC).toInstant();
        } catch (Exception e) {
            throw new RuntimeException("Failed to deserialize Instant: " + e.getMessage(), e);
        }
    }
}
