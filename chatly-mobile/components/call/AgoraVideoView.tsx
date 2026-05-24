import type { ComponentType } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

interface AgoraVideoViewProps {
  uid: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
  isLocal?: boolean;
  zOrderMediaOverlay?: boolean;
}

interface RtcSurfaceViewProps {
  canvas: { uid: number };
  style?: StyleProp<ViewStyle>;
  zOrderMediaOverlay?: boolean;
}

interface AgoraRenderModule {
  RtcSurfaceView: ComponentType<RtcSurfaceViewProps>;
}

let cachedAgoraRenderModule: AgoraRenderModule | null | undefined;

function isAgoraRenderModule(value: unknown): value is AgoraRenderModule {
  if (typeof value !== 'object' || value === null) return false;

  const maybeModule = value as Record<string, unknown>;
  return 'RtcSurfaceView' in maybeModule;
}

function loadAgoraRenderModule(): AgoraRenderModule | null {
  if (cachedAgoraRenderModule !== undefined) {
    return cachedAgoraRenderModule;
  }

  try {
    // Expo Go does not include the native Agora view manager, so this must stay lazy.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const moduleValue = require('react-native-agora') as unknown;
    cachedAgoraRenderModule = isAgoraRenderModule(moduleValue) ? moduleValue : null;
  } catch {
    cachedAgoraRenderModule = null;
  }

  return cachedAgoraRenderModule;
}

export function AgoraVideoView({
  uid,
  className,
  style,
  isLocal = false,
  zOrderMediaOverlay = false,
}: AgoraVideoViewProps) {
  const agoraRenderModule = loadAgoraRenderModule();
  if (!agoraRenderModule) {
    return <View className={className} style={style} />;
  }

  const { RtcSurfaceView } = agoraRenderModule;
  return (
    <View className={className} style={style}>
      <RtcSurfaceView
        canvas={{ uid: isLocal ? 0 : uid }}
        style={styles.surface}
        zOrderMediaOverlay={zOrderMediaOverlay}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    flex: 1,
  },
});
