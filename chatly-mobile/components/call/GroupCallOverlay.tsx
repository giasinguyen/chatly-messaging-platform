import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync } from 'expo-audio';
import { Colors } from '@/constants/theme';
import { useCallStore } from '@/store/call.store';
import { useCallContext } from '@/contexts/CallContext';
import { CallControlButton } from '@/components/call/CallControlButton';
import { GroupParticipantTile } from '@/components/call/GroupParticipantTile';
import { buildAgoraUidKey } from '@/utils/call/agoraUid';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
    upgradeGroupCallToVideo,
    groupAgoraLocalUid,
    groupAgoraHasLocalVideo,
    groupAgoraRemoteUids,
    groupAgoraRemoteVideoUids,
    groupAgoraRemoteVideoKey,
    groupToggleMute,
    groupToggleCamera,
    groupToggleSpeaker,
  } = useCallContext();

  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (callStatus !== 'ONGOING' || !isGroupCall) return;

    setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
      shouldRouteThroughEarpiece: false,
    }).catch(console.error);
    groupToggleSpeaker(true);

    return () => {
      setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: false,
        shouldPlayInBackground: false,
        interruptionMode: 'duckOthers',
        shouldRouteThroughEarpiece: false,
      }).catch(console.error);
    };
  }, [callStatus, groupToggleSpeaker, isGroupCall]);

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

  if ((callStatus !== 'ONGOING' && callStatus !== 'RINGING') || !activeCall || !isGroupCall)
    return null;

  const isVideoCall =
    activeCall.type === 'VIDEO' ||
    groupAgoraHasLocalVideo ||
    Object.values(groupAgoraRemoteVideoUids).some(Boolean);
  const isAgoraGroupCall = activeCall.mediaProvider === 'AGORA';

  const knownAgoraUidKeys = new Set<string>();
  const knownRemotePeers = Object.entries(groupParticipantInfo).map(([peerId, info]) => {
    const agoraUid = Number(buildAgoraUidKey(peerId));
    knownAgoraUidKeys.add(String(agoraUid));
    return {
      peerId,
      agoraUid,
      name: info.name,
      avatar: info.avatar,
    };
  });
  const unknownRemotePeers = groupAgoraRemoteUids
    .filter((uid) => !knownAgoraUidKeys.has(String(uid)))
    .map((uid, index) => ({
      peerId: `agora-${uid}`,
      agoraUid: uid,
      name: `Participant ${knownRemotePeers.length + index + 1}`,
      avatar: null,
    }));
  const remotePeers = [...knownRemotePeers, ...unknownRemotePeers];

  const handleToggleMute = () => {
    const next = !isMuted;
    groupToggleMute(next);
    toggleMuteStore();
  };

  const handleToggleCamera = async () => {
    const nextCameraOff = !isCameraOff;

    if (!nextCameraOff && !groupAgoraHasLocalVideo) {
      try {
        await upgradeGroupCallToVideo();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to upgrade group call to video.';
        Alert.alert('Camera Error', message);
      }
      return;
    }

    groupToggleCamera(nextCameraOff);
    toggleCameraStore();
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
    groupToggleSpeaker(next);
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
      }}>
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-4"
        style={{ paddingTop: 56, paddingBottom: 12 }}>
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
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <GroupParticipantTile
              peerId="local"
              name="You"
              avatar={null}
              isVideoCall={isVideoCall}
              agoraUid={groupAgoraLocalUid}
              hasAgoraVideo={isAgoraGroupCall && groupAgoraHasLocalVideo}
              agoraVideoKey={groupAgoraRemoteVideoKey}
              isLocal
            />
            {remotePeers.length % 2 === 0 && <View style={{ flex: 1, margin: 4 }} />}
          </View>
        }
        renderItem={({ item }) => (
          <GroupParticipantTile
            peerId={item.peerId}
            name={item.name}
            avatar={item.avatar}
            isVideoCall={isVideoCall}
            agoraUid={item.agoraUid}
            hasAgoraVideo={groupAgoraRemoteVideoUids[String(item.agoraUid)] === true}
            agoraVideoKey={groupAgoraRemoteVideoKey}
          />
        )}
      />

      {/* Controls */}
      <View
        className="flex-row items-center justify-center pb-12 pt-4"
        style={{ gap: 20, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <CallControlButton
          icon={isMuted ? 'mic-off' : 'mic'}
          active={isMuted}
          onPress={handleToggleMute}
        />

        <CallControlButton
          icon={isCameraOff ? 'videocam-off' : 'videocam'}
          active={isCameraOff}
          onPress={handleToggleCamera}
        />

        <CallControlButton
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
