import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
import { useCallStore } from '@/store/call.store';
import { useCallContext } from '@/contexts/CallContext';

let RTCView: any;
let Audio: any;

try {
  RTCView = require('react-native-webrtc').RTCView;
} catch {
  RTCView = View;
}

try {
  Audio = require('expo-av').Audio;
} catch {
  Audio = { setAudioModeAsync: async () => {} };
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

interface ParticipantTileProps {
  peerId: string;
  name: string;
  avatar: string | null;
  stream: MediaStream | null;
  isVideoCall: boolean;
}

function ParticipantTile({ peerId: _peerId, name, avatar, stream, isVideoCall }: ParticipantTileProps) {
  return (
    <View
      style={{
        flex: 1,
        margin: 4,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: Colors.bgDark,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks().some((t: { enabled: boolean }) => t.enabled) ? (
        <RTCView streamURL={stream.toURL()} style={{ flex: 1, width: '100%' }} objectFit="cover" />
      ) : (
        <View className="flex-1 items-center justify-center" style={{ padding: 12 }}>
          <Avatar uri={avatar} name={name} size={56} />
          <Text
            className="mt-2 text-sm font-medium text-center"
            style={{ color: Colors.white }}
            numberOfLines={1}
          >
            {name}
          </Text>
        </View>
      )}
    </View>
  );
}

export function GroupCallOverlay() {
  const {
    callStatus,
    activeCall,
    isMuted,
    isCameraOff,
    callDuration,
    isGroupCall,
    groupParticipantInfo,
    toggleMute: toggleMuteStore,
    toggleCamera: toggleCameraStore,
    incrementDuration,
  } = useCallStore();

  const {
    leaveGroupCall,
    groupLocalStream,
    groupRemoteStreams,
    groupToggleMute,
    groupToggleCamera,
  } = useCallContext();

  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (callStatus !== 'ONGOING' || !isGroupCall) return;

    Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: true,
    }).catch(console.error);

    return () => {
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      }).catch(console.error);
    };
  }, [callStatus, isGroupCall]);

  useEffect(() => {
    if (callStatus === 'ONGOING' && isGroupCall) {
      timerRef.current = setInterval(() => incrementDuration(), 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [callStatus, isGroupCall, incrementDuration]);

  if ((callStatus !== 'ONGOING' && callStatus !== 'RINGING') || !activeCall || !isGroupCall) return null;

  const isVideoCall = activeCall.type === 'VIDEO';

  const remotePeers = Object.entries(groupRemoteStreams).map(([peerId, stream]) => ({
    peerId,
    stream,
    name: groupParticipantInfo[peerId]?.name ?? peerId,
    avatar: groupParticipantInfo[peerId]?.avatar ?? null,
  }));

  const handleToggleMute = () => {
    const next = !isMuted;
    groupToggleMute(next);
    toggleMuteStore();
  };

  const handleToggleCamera = () => {
    const next = !isCameraOff;
    groupToggleCamera(next);
    toggleCameraStore();
  };

  const handleToggleSpeaker = () => {
    const next = !isSpeakerOn;
    Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: !next,
    }).catch(console.error);
    setIsSpeakerOn(next);
  };

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
      }}
    >
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-4"
        style={{ paddingTop: 56, paddingBottom: 12 }}
      >
        <Text className="text-base font-medium" style={{ color: Colors.white }}>
          {formatDuration(callDuration)}
        </Text>
        <Text className="text-sm" style={{ color: Colors.textMuted }}>
          {remotePeers.length + 1} participants
        </Text>
      </View>

      {/* Participant grid */}
      <FlatList
        data={remotePeers}
        keyExtractor={(item) => item.peerId}
        numColumns={2}
        contentContainerStyle={{ padding: 4 }}
        style={{ flex: 1 }}
        ListHeaderComponent={
          /* Local stream tile */
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <View
              style={{
                flex: 1,
                margin: 4,
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: '#2C2C2E',
                aspectRatio: 1,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: Colors.cta,
              }}
            >
              {isVideoCall && groupLocalStream ? (
                <RTCView
                  streamURL={groupLocalStream.toURL()}
                  style={{ flex: 1, width: '100%' }}
                  objectFit="cover"
                  mirror
                />
              ) : (
                <View className="flex-1 items-center justify-center" style={{ padding: 12 }}>
                  <Avatar uri={null} name="You" size={56} />
                  <Text className="mt-2 text-sm font-medium" style={{ color: Colors.white }}>
                    You
                  </Text>
                </View>
              )}
            </View>
            {/* Spacer so local tile aligns in the 2-col grid */}
            {remotePeers.length % 2 === 0 && <View style={{ flex: 1, margin: 4 }} />}
          </View>
        }
        renderItem={({ item }) => (
          <ParticipantTile
            peerId={item.peerId}
            name={item.name}
            avatar={item.avatar}
            stream={item.stream}
            isVideoCall={isVideoCall}
          />
        )}
      />

      {/* Controls */}
      <View
        className="flex-row items-center justify-center pb-12 pt-4"
        style={{ gap: 20, backgroundColor: 'rgba(0,0,0,0.5)' }}
      >
        <ControlButton
          icon={isMuted ? 'mic-off' : 'mic'}
          active={isMuted}
          onPress={handleToggleMute}
        />

        <ControlButton
            icon={isCameraOff ? 'videocam-off' : 'videocam'}
            active={isCameraOff}
            onPress={handleToggleCamera}
          />

        <ControlButton
          icon={isSpeakerOn ? 'volume-high' : 'volume-medium'}
          active={isSpeakerOn}
          onPress={handleToggleSpeaker}
        />

        {/* End call */}
        <TouchableOpacity
          onPress={leaveGroupCall}
          className="items-center justify-center"
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: Colors.error,
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="call" size={26} color={Colors.white} style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface ControlButtonProps {
  icon: string;
  active: boolean;
  onPress: () => void;
}

function ControlButton({ icon, active, onPress }: ControlButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="items-center justify-center"
      style={{
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: active ? Colors.error : 'rgba(255,255,255,0.2)',
      }}
      activeOpacity={0.7}
    >
      <Ionicons name={icon as any} size={24} color={Colors.white} />
    </TouchableOpacity>
  );
}
