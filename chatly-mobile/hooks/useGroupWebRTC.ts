import { useRef, useCallback, useState } from 'react';
import type { CallType } from '@/types/call';

let RTCPeerConnection: any;
let RTCSessionDescription: any;
let RTCIceCandidate: any;
let mediaDevices: any;
let MediaStream: any;

try {
  const webrtc = require('react-native-webrtc');
  RTCPeerConnection = webrtc.RTCPeerConnection;
  RTCSessionDescription = webrtc.RTCSessionDescription;
  RTCIceCandidate = webrtc.RTCIceCandidate;
  mediaDevices = webrtc.mediaDevices;
  MediaStream = webrtc.MediaStream;
} catch {
  // react-native-webrtc not available in Expo Go
}

const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

interface GroupWebRTCCallbacks {
  onIceCandidate?: (peerId: string, candidate: RTCIceCandidateInit) => void;
  onPeerStream?: (peerId: string, stream: MediaStream) => void;
  onPeerConnectionFailed?: (peerId: string) => void;
}

interface PeerEntry {
  connection: RTCPeerConnection;
}

export function useGroupWebRTC(callbacks?: GroupWebRTCCallbacks) {
  const peers = useRef<Map<string, PeerEntry>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  const initLocalStream = useCallback(async (type: CallType): Promise<MediaStream> => {
    const constraints = {
      audio: true,
      video: type === 'VIDEO' ? { facingMode: 'user', width: 640, height: 480 } : false,
    };
    const stream = await mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const addPeer = useCallback((peerId: string): RTCPeerConnection => {
    const existing = peers.current.get(peerId);
    if (existing) return existing.connection;

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event: { candidate: RTCIceCandidateInit | null }) => {
      if (event.candidate) {
        callbacksRef.current?.onIceCandidate?.(peerId, event.candidate);
      }
    };

    pc.ontrack = (event: { streams: MediaStream[]; track: MediaStreamTrack }) => {
      const remote = event.streams[0];
      if (remote) {
        setRemoteStreams((prev) => ({ ...prev, [peerId]: remote }));
        callbacksRef.current?.onPeerStream?.(peerId, remote);
      } else if (event.track) {
        // react-native-webrtc may not populate event.streams; build stream from track
        setRemoteStreams((prev) => {
          const existing = prev[peerId];
          const tracks = existing ? [...existing.getTracks(), event.track] : [event.track];
          const ms = MediaStream ? new MediaStream(tracks) : existing;
          return ms ? { ...prev, [peerId]: ms } : prev;
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        callbacksRef.current?.onPeerConnectionFailed?.(peerId);
      }
    };

    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    peers.current.set(peerId, { connection: pc });
    return pc;
  }, []);

  const createOfferForPeer = useCallback(
    async (peerId: string): Promise<RTCSessionDescriptionInit> => {
      const pc = addPeer(peerId);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(new RTCSessionDescription(offer));
      return offer;
    },
    [addPeer],
  );

  const handleOfferFromPeer = useCallback(
    async (peerId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> => {
      const pc = addPeer(peerId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(new RTCSessionDescription(answer));
      return answer;
    },
    [addPeer],
  );

  const handleAnswerFromPeer = useCallback(
    async (peerId: string, answer: RTCSessionDescriptionInit): Promise<void> => {
      const entry = peers.current.get(peerId);
      if (!entry) return;
      await entry.connection.setRemoteDescription(new RTCSessionDescription(answer));
    },
    [],
  );

  const addIceCandidateForPeer = useCallback(
    async (peerId: string, candidate: RTCIceCandidateInit): Promise<void> => {
      const entry = peers.current.get(peerId);
      if (!entry) return;
      await entry.connection.addIceCandidate(new RTCIceCandidate(candidate));
    },
    [],
  );

  const removePeer = useCallback((peerId: string) => {
    const entry = peers.current.get(peerId);
    if (!entry) return;
    entry.connection.close();
    peers.current.delete(peerId);
    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }, []);

  const endAll = useCallback(() => {
    peers.current.forEach((entry) => entry.connection.close());
    peers.current.clear();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStreams({});
  }, []);

  const toggleMute = useCallback((muted: boolean) => {
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }, []);

  const toggleCamera = useCallback(async (cameraOff: boolean) => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length > 0) {
      videoTracks.forEach((track: { enabled: boolean }) => {
        track.enabled = !cameraOff;
      });
    } else if (!cameraOff && mediaDevices) {
      // Voice call → add video track to stream and all peer connections
      const videoStream = await mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      const videoTrack = videoStream.getVideoTracks()[0];
      stream.addTrack(videoTrack);
      setLocalStream(MediaStream ? new MediaStream(stream.getTracks()) : stream);

      peers.current.forEach(({ connection }) => {
        connection.addTrack(videoTrack, stream);
      });
    }
  }, []);

  return {
    localStream,
    remoteStreams,
    initLocalStream,
    addPeer,
    createOfferForPeer,
    handleOfferFromPeer,
    handleAnswerFromPeer,
    addIceCandidateForPeer,
    removePeer,
    endAll,
    toggleMute,
    toggleCamera,
  };
}
