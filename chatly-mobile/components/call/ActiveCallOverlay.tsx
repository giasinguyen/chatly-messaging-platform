import { View, Text, TouchableOpacity } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { RTCView } from 'react-native-webrtc';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
import { useCallStore } from '@/store/call.store';
import { useCallSocket } from '@/hooks/useCallSocket';

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

  const { endCall, localStream, remoteStream, toggleMute, toggleCamera } = useCallSocket();
  const [isExpanded, setIsExpanded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer đếm thời gian cuộc gọi
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

  // Không hiển thị nếu không có cuộc gọi đang diễn ra
  if (callStatus !== 'ONGOING' || !activeCall) return null;

  const isVideoCall = activeCall.type === 'VIDEO';

  const handleToggleMute = () => {
    toggleMuteStore();
    toggleMute(!isMuted);
  };

  const handleToggleCamera = () => {
    toggleCameraStore();
    toggleCamera(!isCameraOff);
  };

  const handleEndCall = () => {
    endCall();
  };

  // Chế độ thu nhỏ (floating)
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
        }}
      >
        {/* Video thu nhỏ hoặc avatar */}
        {isVideoCall && remoteStream ? (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={{ flex: 1 }}
            objectFit="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="call" size={28} color={Colors.online} />
          </View>
        )}

        {/* Thời gian cuộc gọi */}
        <View
          className="items-center py-1"
          style={{ backgroundColor: Colors.online }}
        >
          <Text className="text-xs font-medium" style={{ color: Colors.white }}>
            {formatDuration(callDuration)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Chế độ mở rộng (full screen)
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
      {/* Video remote stream (full screen background) */}
      {isVideoCall && remoteStream ? (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={{ flex: 1 }}
          objectFit="cover"
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Avatar
            uri={remoteParticipant?.avatar ?? null}
            name={remoteParticipant?.name ?? 'User'}
            size={100}
          />
          <Text className="text-lg font-semibold mt-4" style={{ color: Colors.white }}>
            {remoteParticipant?.name ?? 'Cuộc gọi thoại'}
          </Text>
        </View>
      )}

      {/* Video local stream (picture-in-picture) */}
      {isVideoCall && localStream && (
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
          }}
        >
          <RTCView
            streamURL={localStream.toURL()}
            style={{ flex: 1 }}
            objectFit="cover"
            mirror
          />
        </View>
      )}

      {/* Thời gian cuộc gọi */}
      <View
        style={{ position: 'absolute', top: 60, left: 0, right: 0 }}
        className="items-center"
      >
        <Text className="text-base font-medium" style={{ color: Colors.white }}>
          {formatDuration(callDuration)}
        </Text>
      </View>

      {/* Thu nhỏ */}
      <TouchableOpacity
        onPress={() => setIsExpanded(false)}
        style={{ position: 'absolute', top: 56, left: 16 }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-down" size={28} color={Colors.white} />
      </TouchableOpacity>

      {/* Thanh điều khiển */}
      <View
        className="flex-row items-center justify-center pb-12 pt-6"
        style={{ gap: 24, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      >
        {/* Nút tắt/bật mic */}
        <TouchableOpacity
          onPress={handleToggleMute}
          className="items-center justify-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: isMuted ? Colors.error : 'rgba(255, 255, 255, 0.2)',
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isMuted ? 'mic-off' : 'mic'}
            size={26}
            color={Colors.white}
          />
        </TouchableOpacity>

        {/* Nút camera (chỉ hiển thị trong video call) */}
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
            activeOpacity={0.7}
          >
            <Ionicons
              name={isCameraOff ? 'videocam-off' : 'videocam'}
              size={26}
              color={Colors.white}
            />
          </TouchableOpacity>
        )}

        {/* Nút loa ngoài */}
        <TouchableOpacity
          className="items-center justify-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="volume-high" size={26} color={Colors.white} />
        </TouchableOpacity>

        {/* Nút kết thúc cuộc gọi */}
        <TouchableOpacity
          onPress={handleEndCall}
          className="items-center justify-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
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
