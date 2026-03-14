package com.chatly.config;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.ValueDeserializer;

/* 
 * Intanst require kiểu T00:00:00Z nếu không có T thì tự động thêm T00:00:00Z :v
 * 2026-03-08T07:30:00Z   → parsed directly as Instant
 * 2026-03-08             → converted to 2026-03-08T00:00:00Z
*/
public class CustomInstantDeserializer extends ValueDeserializer<Instant> {
    @Override
    public Instant deserialize(JsonParser p, DeserializationContext ctxt) {
        try {
            String text = p.getValueAsString();
            if (text == null || text.isBlank())
                return null;

            if (text.contains("T")) {
                return Instant.parse(text);
            }

            return LocalDate.parse(text).atStartOfDay(ZoneOffset.UTC).toInstant();
        } catch (Exception e) {
            throw new RuntimeException("Failed to deserialize Instant: " + e.getMessage(), e);
        }
    }
}
