import { useState, useRef, useCallback, useEffect } from "react";
import { MAX_RECORDING_SECONDS, AUDIO_MIME_TYPE } from "@/constants/audio";

export interface RecordingResult {
    blob: Blob;
    durationSeconds: number;
}

export class MicPermissionDeniedError extends Error {
    constructor() {
        super("Microphone permission denied");
        this.name = "MicPermissionDeniedError";
    }
}

export function useAudioRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number>(0);

    const cleanup = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setAnalyserNode(null);
        setIsRecording(false);
        setElapsedSeconds(0);
        chunksRef.current = [];
    }, []);

    useEffect(() => {
        return () => cleanup();
    }, [cleanup]);

    const startRecording = useCallback(async () => {
        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === "NotAllowedError") {
                throw new MicPermissionDeniedError();
            }
            throw err;
        }

        streamRef.current = stream;

        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        setAnalyserNode(analyser);

        const recorder = new MediaRecorder(stream, { mimeType: AUDIO_MIME_TYPE });
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.start(100);
        startTimeRef.current = Date.now();
        setIsRecording(true);
        setElapsedSeconds(0);

        timerRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            setElapsedSeconds(elapsed);
            if (elapsed >= MAX_RECORDING_SECONDS) {
                // Auto-stop at limit — caller should handle via stopRecording
                clearInterval(timerRef.current!);
                timerRef.current = null;
            }
        }, 1000);
    }, []);

    const stopRecording = useCallback((): Promise<RecordingResult | null> => {
        return new Promise((resolve) => {
            const recorder = mediaRecorderRef.current;
            if (!recorder || recorder.state === "inactive") {
                cleanup();
                resolve(null);
                return;
            }

            const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: AUDIO_MIME_TYPE });
                cleanup();
                resolve({ blob, durationSeconds });
            };

            recorder.stop();
        });
    }, [cleanup]);

    const cancelRecording = useCallback(() => {
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state !== "inactive") {
            recorder.ondataavailable = null;
            recorder.onstop = null;
            recorder.stop();
        }
        cleanup();
    }, [cleanup]);

    return { isRecording, elapsedSeconds, analyserNode, startRecording, stopRecording, cancelRecording };
}
