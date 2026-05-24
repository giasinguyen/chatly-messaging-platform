import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera } from 'expo-camera';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import type { IRtcEngine, IRtcEngineEventHandler } from 'react-native-agora';
import { callService } from '@/services/call.service';
import type { CallType } from '@/types/call';

type AgoraModule = typeof import('react-native-agora');

interface JoinAgoraCallParams {
  conversationId: string;
  callId: string;
  type: CallType;
}

interface AgoraVideoState {
  localUid: number | null;
  remoteUid: number | null;
  hasLocalVideo: boolean;
  hasRemoteVideo: boolean;
  remoteVideoKey: number;
}

let cachedAgoraModule: AgoraModule | null | undefined;

function loadAgoraModule(): AgoraModule | null {
  if (cachedAgoraModule !== undefined) {
    return cachedAgoraModule;
  }

  try {
    cachedAgoraModule = require('react-native-agora') as AgoraModule;
  } catch {
    cachedAgoraModule = null;
  }

  return cachedAgoraModule;
}

async function requestAgoraPermissions(type: CallType): Promise<void> {
  const microphonePermission = await requestRecordingPermissionsAsync();
  if (microphonePermission.status !== 'granted') {
    throw new Error('Microphone permission is required to join the call.');
  }

  if (type !== 'VIDEO') return;

  const cameraPermission = await Camera.requestCameraPermissionsAsync();
  if (cameraPermission.status !== 'granted') {
    throw new Error('Camera permission is required to join the video call.');
  }
}

export function useAgoraMediaCall() {
  const engineRef = useRef<IRtcEngine | null>(null);
  const appIdRef = useRef<string | null>(null);
  const isJoinedRef = useRef(false);
  const eventHandlerRef = useRef<IRtcEngineEventHandler | null>(null);
  const [videoState, setVideoState] = useState<AgoraVideoState>({
    localUid: null,
    remoteUid: null,
    hasLocalVideo: false,
    hasRemoteVideo: false,
    remoteVideoKey: 0,
  });

  const resetVideoState = useCallback(() => {
    setVideoState({
      localUid: null,
      remoteUid: null,
      hasLocalVideo: false,
      hasRemoteVideo: false,
      remoteVideoKey: 0,
    });
  }, []);

  const ensureEngine = useCallback((appId: string): IRtcEngine => {
    const agoraModule = loadAgoraModule();
    if (!agoraModule) {
      throw new Error('Agora is not available. Please rebuild the development app.');
    }

    if (engineRef.current && appIdRef.current === appId) {
      return engineRef.current;
    }

    if (engineRef.current) {
      engineRef.current.release();
      engineRef.current = null;
    }

    const engine = agoraModule.createAgoraRtcEngine();
    engine.initialize({ appId });
    engine.setChannelProfile(agoraModule.ChannelProfileType.ChannelProfileCommunication);
    engine.setClientRole(agoraModule.ClientRoleType.ClientRoleBroadcaster);
    engine.enableAudio();
    engine.enableLocalAudio(true);

    const eventHandler: IRtcEngineEventHandler = {
      onUserJoined: (_connection, remoteUid) => {
        setVideoState((state) => ({ ...state, remoteUid }));
      },
      onUserOffline: (_connection, remoteUid) => {
        setVideoState((state) =>
          state.remoteUid === remoteUid
            ? {
                ...state,
                remoteUid: null,
                hasRemoteVideo: false,
                remoteVideoKey: state.remoteVideoKey + 1,
              }
            : state
        );
      },
      onFirstRemoteVideoFrame: (_connection, remoteUid) => {
        setVideoState((state) => ({
          ...state,
          remoteUid,
          hasRemoteVideo: true,
          remoteVideoKey: state.remoteVideoKey + 1,
        }));
      },
      onRemoteVideoStateChanged: (_connection, remoteUid, state) => {
        const isDecoding = state === agoraModule.RemoteVideoState.RemoteVideoStateDecoding;
        const isStopped = state === agoraModule.RemoteVideoState.RemoteVideoStateStopped;
        setVideoState((current) => ({
          ...current,
          remoteUid,
          hasRemoteVideo: isDecoding ? true : isStopped ? false : current.hasRemoteVideo,
          remoteVideoKey:
            isDecoding || isStopped ? current.remoteVideoKey + 1 : current.remoteVideoKey,
        }));
      },
      onLocalVideoStateChanged: (_source, state) => {
        const hasLocalVideo =
          state === agoraModule.LocalVideoStreamState.LocalVideoStreamStateCapturing ||
          state === agoraModule.LocalVideoStreamState.LocalVideoStreamStateEncoding;
        setVideoState((current) => ({ ...current, hasLocalVideo }));
      },
    };
    engine.registerEventHandler(eventHandler);

    engineRef.current = engine;
    appIdRef.current = appId;
    eventHandlerRef.current = eventHandler;
    return engine;
  }, []);

  const enableVideo = useCallback(async (): Promise<boolean> => {
    const agoraModule = loadAgoraModule();
    const engine = engineRef.current;
    if (!agoraModule || !engine) return false;

    const cameraPermission = await Camera.requestCameraPermissionsAsync();
    if (cameraPermission.status !== 'granted') return false;

    engine.enableVideo();
    engine.enableLocalVideo(true);
    engine.muteLocalVideoStream(false);
    engine.updateChannelMediaOptions({
      channelProfile: agoraModule.ChannelProfileType.ChannelProfileCommunication,
      clientRoleType: agoraModule.ClientRoleType.ClientRoleBroadcaster,
      publishMicrophoneTrack: true,
      publishCameraTrack: true,
      autoSubscribeAudio: true,
      autoSubscribeVideo: true,
    });
    engine.startPreview();
    setVideoState((state) => ({ ...state, hasLocalVideo: true }));
    return true;
  }, []);

  const joinCall = useCallback(
    async ({
      conversationId,
      callId,
      type,
    }: JoinAgoraCallParams): Promise<{ hasLocalVideo: boolean }> => {
      await requestAgoraPermissions(type);

      const response = await callService.createAgoraToken({ conversationId, callId });
      if (response.code !== 1000) {
        throw new Error(response.message ?? 'Unable to prepare the call.');
      }

      const { appId, channelName, uid, token } = response.result;
      const agoraModule = loadAgoraModule();
      if (!agoraModule) {
        throw new Error('Agora is not available. Please rebuild the development app.');
      }

      const engine = ensureEngine(appId);
      const hasVideo = type === 'VIDEO';
      if (hasVideo) {
        engine.enableVideo();
        engine.enableLocalVideo(true);
        engine.startPreview();
      } else {
        engine.enableLocalVideo(false);
      }

      if (!isJoinedRef.current) {
        engine.joinChannel(token ?? '', channelName, uid, {
          channelProfile: agoraModule.ChannelProfileType.ChannelProfileCommunication,
          clientRoleType: agoraModule.ClientRoleType.ClientRoleBroadcaster,
          publishMicrophoneTrack: true,
          publishCameraTrack: hasVideo,
          autoSubscribeAudio: true,
          autoSubscribeVideo: true,
        });
        isJoinedRef.current = true;
      } else {
        engine.updateChannelMediaOptions({
          channelProfile: agoraModule.ChannelProfileType.ChannelProfileCommunication,
          clientRoleType: agoraModule.ClientRoleType.ClientRoleBroadcaster,
          publishMicrophoneTrack: true,
          publishCameraTrack: hasVideo,
          autoSubscribeAudio: true,
          autoSubscribeVideo: true,
        });
      }

      setVideoState((state) => ({
        ...state,
        localUid: uid,
        hasLocalVideo: hasVideo,
      }));
      return { hasLocalVideo: hasVideo };
    },
    [ensureEngine]
  );

  const leaveCall = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.stopPreview();
    engine.enableLocalVideo(false);
    engine.disableVideo();
    engine.leaveChannel();
    isJoinedRef.current = false;
    resetVideoState();
  }, [resetVideoState]);

  const toggleMute = useCallback((muted: boolean) => {
    engineRef.current?.muteLocalAudioStream(muted);
  }, []);

  const toggleCamera = useCallback(
    async (cameraOff: boolean): Promise<boolean> => {
      const engine = engineRef.current;
      if (!engine) return false;

      if (!cameraOff) {
        return enableVideo();
      }

      engine.muteLocalVideoStream(true);
      engine.enableLocalVideo(false);
      setVideoState((state) => ({ ...state, hasLocalVideo: false }));
      return false;
    },
    [enableVideo]
  );

  useEffect(
    () => () => {
      const engine = engineRef.current;
      if (!engine) return;

      if (eventHandlerRef.current) {
        engine.unregisterEventHandler(eventHandlerRef.current);
      }
      engine.stopPreview();
      engine.leaveChannel();
      engine.release();
      engineRef.current = null;
      appIdRef.current = null;
      eventHandlerRef.current = null;
      isJoinedRef.current = false;
    },
    []
  );

  return {
    joinCall,
    leaveCall,
    toggleMute,
    toggleCamera,
    enableVideo,
    ...videoState,
  };
}
