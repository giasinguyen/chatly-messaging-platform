const DEFAULT_STUN_URLS = [
    "stun:stun.l.google.com:19302",
    "stun:stun1.l.google.com:19302",
    "stun:stun2.l.google.com:19302",
    "stun:stun3.l.google.com:19302",
];

const DEFAULT_TURN_URLS = [
    "turn:openrelay.metered.ca:80",
    "turn:openrelay.metered.ca:443",
    "turn:openrelay.metered.ca:443?transport=tcp",
    "turns:openrelay.metered.ca:443?transport=tcp",
];

const DEFAULT_TURN_USERNAME = "openrelayproject";
const DEFAULT_TURN_CREDENTIAL = "openrelayproject";
const ICE_CANDIDATE_POOL_SIZE = 10;

function splitUrls(value: string | undefined): string[] {
    return (value ?? "")
        .split(",")
        .map((url) => url.trim())
        .filter(Boolean);
}

function getEnvOrDefault(value: string | undefined, fallback: string): string {
    const normalized = value?.trim();
    return normalized ? normalized : fallback;
}

function buildIceServers(): RTCIceServer[] {
    const stunUrls = splitUrls(import.meta.env.VITE_WEBRTC_STUN_URLS);
    const turnUrls = splitUrls(import.meta.env.VITE_WEBRTC_TURN_URLS);
    const username = getEnvOrDefault(
        import.meta.env.VITE_WEBRTC_TURN_USERNAME,
        DEFAULT_TURN_USERNAME,
    );
    const credential = getEnvOrDefault(
        import.meta.env.VITE_WEBRTC_TURN_CREDENTIAL,
        DEFAULT_TURN_CREDENTIAL,
    );

    return [
        { urls: stunUrls.length > 0 ? stunUrls : DEFAULT_STUN_URLS },
        {
            urls: turnUrls.length > 0 ? turnUrls : DEFAULT_TURN_URLS,
            username,
            credential,
        },
    ];
}

export const WEBRTC_ICE_CONFIG: RTCConfiguration = {
    iceServers: buildIceServers(),
    iceCandidatePoolSize: ICE_CANDIDATE_POOL_SIZE,
    iceTransportPolicy:
        import.meta.env.VITE_WEBRTC_FORCE_RELAY === "true" ? "relay" : "all",
};
