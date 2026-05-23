export const MAX_RECORDING_SECONDS = 300;

export const AUDIO_MIME_PREFERRED = "audio/webm";
export const AUDIO_MIME_FALLBACK = "audio/mp4";

export const AUDIO_MIME_TYPE =
    typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(AUDIO_MIME_PREFERRED)
        ? AUDIO_MIME_PREFERRED
        : AUDIO_MIME_FALLBACK;
