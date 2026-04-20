export const DEFAULT_CAMERA_CONSTRAINTS: MediaTrackConstraints = {
    facingMode: "user",
    width: 640,
    height: 480,
};

export const VOICE_CALL_MEDIA_CONSTRAINTS: MediaStreamConstraints = {
    audio: true,
};

export const VIDEO_CALL_MEDIA_CONSTRAINTS: MediaStreamConstraints = {
    audio: true,
    video: DEFAULT_CAMERA_CONSTRAINTS,
};

export const CAMERA_ONLY_MEDIA_CONSTRAINTS: MediaStreamConstraints = {
    video: DEFAULT_CAMERA_CONSTRAINTS,
};
