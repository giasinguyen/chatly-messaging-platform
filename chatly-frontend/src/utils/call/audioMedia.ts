import { VOICE_CALL_MEDIA_CONSTRAINTS } from "@/constants/callMedia";

function getMediaErrorName(error: unknown): string {
    return error instanceof DOMException ? error.name : "";
}

export async function requestMicrophoneStream(): Promise<MediaStream> {
    try {
        return await navigator.mediaDevices.getUserMedia(VOICE_CALL_MEDIA_CONSTRAINTS);
    } catch (error) {
        const errorName = getMediaErrorName(error);
        if (errorName === "NotAllowedError") {
            throw new Error("Please grant microphone permission to make the call.");
        }
        throw new Error("Microphone is inaccessible.");
    }
}
