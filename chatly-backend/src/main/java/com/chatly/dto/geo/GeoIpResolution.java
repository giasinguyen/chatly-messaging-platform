package com.chatly.dto.geo;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Result of resolving a public IP via ipwho.is (full JSON) plus a display label derived from city/region/country.
 */
public record GeoIpResolution(String locationLabel, JsonNode snapshot) {}
