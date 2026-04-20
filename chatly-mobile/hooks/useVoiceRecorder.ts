import { useState, useRef, useCallback, useEffect } from 'react';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system';

export const MAX_RECORDING_SECONDS = 300;

export interface VoiceRecordingResult {
  uri: string;
  durationSeconds: number;
}

export class MicPermissionDeniedError extends Error {
  constructor() {
    super('Microphone permission denied');
    this.name = 'MicPermissionDeniedError';
  }
}

export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const safeGetStatus = useCallback(() => {
    try {
      return recorder.getStatus();
    } catch {
      return null;
    }
  }, [recorder]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopTimer();
      const status = safeGetStatus();
      if (status?.isRecording) {
        recorder.stop().catch(() => {});
      }
    };
  }, [recorder, safeGetStatus, stopTimer]);

  const startRecording = useCallback(async () => {
    const { status } = await requestRecordingPermissionsAsync();
    if (status !== 'granted') {
      throw new MicPermissionDeniedError();
    }

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
      shouldRouteThroughEarpiece: true,
    });

    await recorder.prepareToRecordAsync();
    recorder.record();
    startTimeRef.current = Date.now();
    setIsRecording(true);
    setElapsedSeconds(0);

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedSeconds(elapsed);
      if (elapsed >= MAX_RECORDING_SECONDS) {
        stopTimer();
      }
    }, 1000);
  }, [recorder, stopTimer]);

  const stopRecording = useCallback(async (): Promise<VoiceRecordingResult | null> => {
    stopTimer();
    const preStopStatus = safeGetStatus();
    if (!preStopStatus?.isRecording) {
      if (isMountedRef.current) {
        setIsRecording(false);
        setElapsedSeconds(0);
      }
      return null;
    }

    try {
      await recorder.stop();
      const status = safeGetStatus();
      const uri = status?.url;
      if (isMountedRef.current) {
        setIsRecording(false);
      }
      const durationSeconds = Math.round(((status?.durationMillis ?? (Date.now() - startTimeRef.current))) / 1000);
      if (isMountedRef.current) {
        setElapsedSeconds(0);
      }

      if (!uri) return null;
      return { uri, durationSeconds };
    } catch {
      if (isMountedRef.current) {
        setIsRecording(false);
        setElapsedSeconds(0);
      }
      return null;
    } finally {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: false,
        shouldPlayInBackground: false,
        interruptionMode: 'duckOthers',
        shouldRouteThroughEarpiece: false,
      });
    }
  }, [recorder, safeGetStatus, stopTimer]);

  const cancelRecording = useCallback(async () => {
    stopTimer();
    const preCancelStatus = safeGetStatus();
    if (!preCancelStatus?.isRecording) {
      if (isMountedRef.current) {
        setIsRecording(false);
        setElapsedSeconds(0);
      }
      return;
    }
    try {
      await recorder.stop();
      const uri = safeGetStatus()?.url;
      if (uri) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch {
      // Ignore errors during cancel cleanup
    } finally {
      if (isMountedRef.current) {
        setIsRecording(false);
        setElapsedSeconds(0);
      }
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: false,
        shouldPlayInBackground: false,
        interruptionMode: 'duckOthers',
        shouldRouteThroughEarpiece: false,
      });
    }
  }, [recorder, safeGetStatus, stopTimer]);

  return { isRecording, elapsedSeconds, startRecording, stopRecording, cancelRecording };
}
