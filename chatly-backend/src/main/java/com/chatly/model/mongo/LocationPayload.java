package com.chatly.model.mongo;

import lombok.*;

/**
 * Embedded document for LOCATION type messages.
 * Stores a one-time location snapshot — no live tracking.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LocationPayload {

    private Double latitude;

    private Double longitude;

    /** Human-readable display name or reverse-geocoded address. */
    private String address;

    /** Optional static map image URL (e.g. from Google Maps Static API). */
    private String mapSnapshotUrl;
}
