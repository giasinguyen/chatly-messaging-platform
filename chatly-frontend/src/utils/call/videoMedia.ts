import {
    CAMERA_ONLY_MEDIA_CONSTRAINTS,
    VIDEO_CALL_MEDIA_CONSTRAINTS,
} from "@/constants/callMedia";
import { requestMicrophoneStream } from "@/utils/call/audioMedia";

const CAMERA_UNAVAILABLE_ERRORS = new Set([
    "NotFoundError",
    "DevicesNotFoundError",
    "NotReadableError",
]);

function getMediaErrorName(error: unknown): string {
    return error instanceof DOMException ? error.name : "";
}

export async function requestVideoCallStream(): Promise<MediaStream> {
    try {
        return await navigator.mediaDevices.getUserMedia(VIDEO_CALL_MEDIA_CONSTRAINTS);
    } catch (error) {
        const errorName = getMediaErrorName(error);

        if (CAMERA_UNAVAILABLE_ERRORS.has(errorName)) {
            return requestMicrophoneStream();
        }

        if (errorName === "NotAllowedError") {
            throw new Error("Please grant microphone/camera permission to make the call.");
        }

        throw new Error("Unable to access media device.");
    }
}

export async function requestCameraTrack(): Promise<MediaStreamTrack> {
    try {
        const stream = await navigator.mediaDevices.getUserMedia(CAMERA_ONLY_MEDIA_CONSTRAINTS);
        const videoTrack = stream.getVideoTracks()[0];

        if (!videoTrack) {
            throw new Error("No camera track available.");
        }

        return videoTrack;
    } catch (error) {
        if (error instanceof Error && error.message === "No camera track available.") {
            throw error;
        }

        const errorName = getMediaErrorName(error);
        if (errorName === "NotAllowedError") {
            throw new Error("Please grant camera permission to continue.");
        }

        throw new Error("Unable to access camera.");
    }
}
