import {
  Alert,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync } from 'expo-audio';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
import { useCallStore } from '@/store/call.store';
import { useCallContext } from '@/contexts/CallContext';
import { AgoraVideoView } from '@/components/call/AgoraVideoView';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function ActiveCallOverlay() {
  const {
    callStatus,
    activeCall,
    isMuted,
    isCameraOff,
    callDuration,
    remoteParticipant,
    toggleMute: toggleMuteStore,
    toggleCamera: toggleCameraStore,
    incrementDuration,
  } = useCallStore();

  const {
    endCall,
    agoraLocalUid,
    agoraRemoteUid,
    agoraHasLocalVideo,
    agoraHasRemoteVideo,
    agoraRemoteVideoKey,
    toggleMute,
    toggleCamera,
    upgradeToVideo,
  } = useCallContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isUpgradingToVideo, setIsUpgradingToVideo] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (callStatus !== 'ONGOING' || !activeCall) return;

    const isVideo = activeCall.type === 'VIDEO';
    setIsSpeakerOn(isVideo);

    setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
      shouldRouteThroughEarpiece: !isVideo,
    }).catch(console.error);

    return () => {
      setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: false,
        shouldPlayInBackground: false,
        interruptionMode: 'duckOthers',
        shouldRouteThroughEarpiece: false,
      }).catch(console.error);
    };
  }, [callStatus, activeCall]);

  useEffect(() => {
    if (callStatus === 'ONGOING') {
      timerRef.current = setInterval(() => {
        incrementDuration();
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [callStatus, incrementDuration]);

  if (callStatus !== 'ONGOING' || !activeCall) return null;

  const isVideoCall = activeCall.type === 'VIDEO' || agoraHasLocalVideo || agoraHasRemoteVideo;
  const shouldRenderAgoraRemoteVideo = isVideoCall && agoraRemoteUid !== null;
  const shouldRenderAgoraLocalVideo = isVideoCall && agoraHasLocalVideo && agoraLocalUid !== null;

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    toggleMute(newMuted);
    toggleMuteStore();
  };

  const handleToggleSpeaker = () => {
    const next = !isSpeakerOn;
    setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
      shouldRouteThroughEarpiece: !next,
    }).catch(console.error);
    setIsSpeakerOn(next);
  };

  const handleToggleCamera = async () => {
    if (isCameraOff && !agoraHasLocalVideo) {
      try {
        await upgradeToVideo();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to enable camera.';
        Alert.alert('Camera Error', message);
      }
      return;
    }

    toggleCameraStore();
    toggleCamera(!isCameraOff);
  };

  const handleUpgradeToVideo = async () => {
    if (isUpgradingToVideo) return;

    try {
      setIsUpgradingToVideo(true);
      await upgradeToVideo();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upgrade to video call.';
      Alert.alert('Upgrade Failed', message);
    } finally {
      setIsUpgradingToVideo(false);
    }
  };

  const handleEndCall = () => {
    endCall();
  };

  // Floating mode (collapsed)
  if (!isExpanded) {
    return (
      <TouchableOpacity
        onPress={() => setIsExpanded(true)}
        activeOpacity={0.9}
        style={{
          position: 'absolute',
          top: 60,
          right: 16,
          zIndex: 50,
          width: 100,
          height: 130,
          borderRadius: 16,
          backgroundColor: Colors.bgDark,
          overflow: 'hidden',
          shadowColor: Colors.black,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 10,
        }}>
        {shouldRenderAgoraRemoteVideo ? (
          <AgoraVideoView key={agoraRemoteVideoKey} uid={agoraRemoteUid ?? 0} className="flex-1" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="call" size={28} color={Colors.online} />
          </View>
        )}

        <View className="items-center py-1" style={{ backgroundColor: Colors.online }}>
          <Text className="text-xs font-medium" style={{ color: Colors.white }}>
            {formatDuration(callDuration)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Expanded mode (full screen)
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        backgroundColor: Colors.bgDark,
      }}>
      {/* Remote video (full screen background) */}
      {shouldRenderAgoraRemoteVideo ? (
        <AgoraVideoView key={agoraRemoteVideoKey} uid={agoraRemoteUid ?? 0} className="flex-1" />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Avatar
            uri={remoteParticipant?.avatar ?? null}
            name={remoteParticipant?.name ?? 'User'}
            size={100}
          />
          <Text className="mt-4 text-lg font-semibold" style={{ color: Colors.white }}>
            {remoteParticipant?.name ?? 'Voice call'}
          </Text>
        </View>
      )}

      {/* Local video (picture-in-picture) */}
      {shouldRenderAgoraLocalVideo && (
        <View
          style={{
            position: 'absolute',
            top: 60,
            right: 16,
            width: 100,
            height: 140,
            borderRadius: 12,
            overflow: 'hidden',
            borderWidth: 2,
            borderColor: Colors.white,
          }}>
          <AgoraVideoView
            uid={agoraLocalUid ?? 0}
            isLocal
            zOrderMediaOverlay
            className="flex-1"
          />
        </View>
      )}

      {/* Call duration */}
      <View style={{ position: 'absolute', top: 60, left: 0, right: 0 }} className="items-center">
        <Text className="text-base font-medium" style={{ color: Colors.white }}>
          {formatDuration(callDuration)}
        </Text>
      </View>

      {/* Minimize button */}
      <TouchableOpacity
        onPress={() => setIsExpanded(false)}
        style={{ position: 'absolute', top: 56, left: 16 }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-down" size={28} color={Colors.white} />
      </TouchableOpacity>

      {/* Controls bar */}
      <View className="flex-row items-center justify-center pb-12 pt-6" style={styles.controlsBar}>
        {/* Mute/unmute mic button */}
        <TouchableOpacity
          onPress={handleToggleMute}
          className="items-center justify-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: isMuted ? Colors.error : 'rgba(255, 255, 255, 0.2)',
          }}
          activeOpacity={0.7}>
          <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={26} color={Colors.white} />
        </TouchableOpacity>

        {/* Camera button (only in video call) */}
        {isVideoCall && (
          <TouchableOpacity
            onPress={handleToggleCamera}
            className="items-center justify-center"
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: isCameraOff ? Colors.error : 'rgba(255, 255, 255, 0.2)',
            }}
            activeOpacity={0.7}>
            <Ionicons
              name={isCameraOff ? 'videocam-off' : 'videocam'}
              size={26}
              color={Colors.white}
            />
          </TouchableOpacity>
        )}

        {!isVideoCall && (
          <TouchableOpacity
            onPress={handleUpgradeToVideo}
            className="items-center justify-center"
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: Colors.error,
            }}
            activeOpacity={0.7}
            disabled={isUpgradingToVideo}>
            <Ionicons name="videocam-off" size={26} color={Colors.white} />
          </TouchableOpacity>
        )}

        {/* Speaker button */}
        <TouchableOpacity
          onPress={handleToggleSpeaker}
          className="items-center justify-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: isSpeakerOn ? Colors.cta : 'rgba(255, 255, 255, 0.2)',
          }}
          activeOpacity={0.7}>
          <Ionicons
            name={isSpeakerOn ? 'volume-high' : 'volume-medium'}
            size={26}
            color={Colors.white}
          />
        </TouchableOpacity>

        {/* End call button */}
        <TouchableOpacity
          onPress={handleEndCall}
          className="items-center justify-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: Colors.error,
          }}
          activeOpacity={0.7}>
          <Ionicons
            name="call"
            size={26}
            color={Colors.white}
            style={{ transform: [{ rotate: '135deg' }] }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controlsBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});
