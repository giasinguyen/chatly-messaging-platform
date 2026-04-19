import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
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
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopTimer();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
    };
  }, [stopTimer]);

  const startRecording = useCallback(async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new MicPermissionDeniedError();
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );
    recordingRef.current = recording;
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
  }, [stopTimer]);

  const stopRecording = useCallback(async (): Promise<VoiceRecordingResult | null> => {
    stopTimer();
    const recording = recordingRef.current;
    if (!recording) {
      setIsRecording(false);
      setElapsedSeconds(0);
      return null;
    }

    try {
      await recording.stopAndUnloadAsync();
      const status = await recording.getStatusAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      setIsRecording(false);
      const durationSeconds = status.isRecording
        ? 0
        : Math.round((status.durationMillis ?? (Date.now() - startTimeRef.current)) / 1000);
      setElapsedSeconds(0);

      if (!uri) return null;
      return { uri, durationSeconds };
    } catch {
      recordingRef.current = null;
      setIsRecording(false);
      setElapsedSeconds(0);
      return null;
    } finally {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    }
  }, [stopTimer]);

  const cancelRecording = useCallback(async () => {
    stopTimer();
    const recording = recordingRef.current;
    if (!recording) {
      setIsRecording(false);
      setElapsedSeconds(0);
      return;
    }
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch {
      // Ignore errors during cancel cleanup
    } finally {
      recordingRef.current = null;
      setIsRecording(false);
      setElapsedSeconds(0);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    }
  }, [stopTimer]);

  return { isRecording, elapsedSeconds, startRecording, stopRecording, cancelRecording };
}
