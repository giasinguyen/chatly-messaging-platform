import { View, Text, type StyleProp, type ViewStyle } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
import { AgoraVideoView } from '@/components/call/AgoraVideoView';

interface GroupParticipantTileProps {
  peerId: string;
  name: string;
  avatar: string | null;
  isVideoCall: boolean;
  agoraUid?: number | null;
  hasAgoraVideo?: boolean;
  agoraVideoKey?: number;
  isLocal?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GroupParticipantTile({
  peerId,
  name,
  avatar,
  isVideoCall,
  agoraUid = null,
  hasAgoraVideo = false,
  agoraVideoKey = 0,
  isLocal = false,
}: GroupParticipantTileProps) {
  const shouldRenderAgoraVideo = isVideoCall && agoraUid !== null && hasAgoraVideo;

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
        borderWidth: isLocal ? 2 : 0,
        borderColor: isLocal ? Colors.cta : 'transparent',
      }}>
      {shouldRenderAgoraVideo ? (
        <>
          <AgoraVideoView
            key={`${peerId}:${agoraVideoKey}`}
            uid={agoraUid}
            isLocal={isLocal}
            zOrderMediaOverlay={isLocal}
            className="w-full flex-1"
          />
          <View
            className="absolute bottom-2 left-2 right-2 rounded-full px-2 py-1"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
            <Text
              className="text-center text-xs font-semibold"
              style={{ color: Colors.white }}
              numberOfLines={1}>
              {name}
            </Text>
          </View>
        </>
      ) : (
        <View className="flex-1 items-center justify-center" style={{ padding: 12 }}>
          <Avatar uri={avatar} name={name} size={56} />
          <Text
            className="mt-2 text-center text-sm font-medium"
            style={{ color: Colors.white }}
            numberOfLines={1}>
            {name}
          </Text>
        </View>
      )}
    </View>
  );
}
