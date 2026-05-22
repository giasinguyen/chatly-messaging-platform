import { useState, useRef, useEffect, useMemo } from 'react';
import { View, Animated, PanResponder, Text } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { normalizeMediaUrl } from '@/utils/mediaUrl';

interface PostImageCarouselProps {
  images: string[];
  onDoubleTap?: () => void;
}

const FALLBACK_ASPECT_RATIO = 1;
const FALLBACK_MEDIA_SOURCE = require('@/assets/fallback-image.png');

function getFrameAspectRatio(imageSizes: Record<string, number>): number {
  const aspectRatios = Object.values(imageSizes);
  if (aspectRatios.length === 0) {
    return FALLBACK_ASPECT_RATIO;
  }

  return Math.min(...aspectRatios);
}

export function PostImageCarousel({ images, onDoubleTap }: PostImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageAspectRatios, setImageAspectRatios] = useState<Record<string, number>>({});
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const currentIndexRef = useRef(0);
  const lastTapRef = useRef(0);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const normalizedImages = useMemo(
    () => images.map((uri) => normalizeMediaUrl(uri)).filter((uri): uri is string => Boolean(uri)),
    [images],
  );

  const triggerDoubleTap = () => {
    heartScale.setValue(0.45);
    heartOpacity.setValue(1);
    Animated.parallel([
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 4,
        tension: 110,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(420),
        Animated.timing(heartOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    onDoubleTap?.();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => normalizedImages.length > 1 || Boolean(onDoubleTap),
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 8 && Math.abs(gestureState.dy) < 12 && normalizedImages.length > 1,
      onPanResponderRelease: (evt, { vx }) => {
        const idx = currentIndexRef.current;
        const now = Date.now();
        const tapGapMs = 280;

        if (Math.abs(vx) < 0.2) {
          if (now - lastTapRef.current <= tapGapMs) {
            lastTapRef.current = 0;
            triggerDoubleTap();
            return;
          }

          lastTapRef.current = now;
          return;
        }

        // vx is velocity in x direction
        if (vx > 0.5 && idx > 0) {
          // Swipe right - show previous image
          setCurrentIndex((i) => Math.max(0, i - 1));
        } else if (vx < -0.5 && idx < normalizedImages.length - 1) {
          // Swipe left - show next image
          setCurrentIndex((i) => Math.min(normalizedImages.length - 1, i + 1));
        }
      },
    }),
  ).current;

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    setFailedImages({});
  }, [images]);

  useEffect(() => {
    if (currentIndex < normalizedImages.length) {
      return;
    }

    setCurrentIndex(0);
  }, [currentIndex, normalizedImages.length]);

  useEffect(() => {
    let isMounted = true;

    setImageAspectRatios({});
    if (normalizedImages.length !== 1) {
      return undefined;
    }

    Promise.all(
      normalizedImages.map(async (uri) => {
        try {
          const imageRef = await Image.loadAsync(uri);
          return [uri, imageRef.width / imageRef.height] as const;
        } catch {
          return null;
        }
      })
    )
      .then((ratios) => {
        if (!isMounted) {
          return;
        }

        const measuredRatios = ratios.filter((ratio) => ratio !== null);
        setImageAspectRatios(Object.fromEntries(measuredRatios));
      });

    return () => {
      isMounted = false;
    };
  }, [normalizedImages]);

  const frameAspectRatio =
    normalizedImages.length === 1 ? getFrameAspectRatio(imageAspectRatios) : FALLBACK_ASPECT_RATIO;

  const handleImageError = (uri: string) => {
    setFailedImages((prev) => ({ ...prev, [uri]: true }));
  };

  if (images.length === 0) {
    return null;
  }

  if (normalizedImages.length === 0) {
    return (
      <View
        style={{
          width: '100%',
          aspectRatio: FALLBACK_ASPECT_RATIO,
          backgroundColor: '#F5F5F7',
        }}
      >
        <Image
          source={FALLBACK_MEDIA_SOURCE}
          contentFit="cover"
          style={{ width: '100%', height: '100%' }}
        />
      </View>
    );
  }

  // Single image - just display
  if (normalizedImages.length === 1) {
    const imageUrl = normalizedImages[0];
    const imageSource = failedImages[imageUrl] ? FALLBACK_MEDIA_SOURCE : { uri: imageUrl };

    return (
      <View
        {...panResponder.panHandlers}
        style={{ width: '100%', aspectRatio: frameAspectRatio, backgroundColor: '#F5F5F7' }}
      >
        <Image
          source={imageSource}
          contentFit={failedImages[imageUrl] ? 'cover' : 'contain'}
          transition={120}
          style={{ width: '100%', height: '100%' }}
          onError={failedImages[imageUrl] ? undefined : () => handleImageError(imageUrl)}
        />
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: heartOpacity,
            transform: [{ scale: heartScale }],
          }}
        >
          <Ionicons name="heart" size={96} color="rgba(255,255,255,0.95)" />
        </Animated.View>
      </View>
    );
  }

  // Multiple images - show carousel
  const currentImage = normalizedImages[currentIndex];
  const currentImageSource = failedImages[currentImage]
    ? FALLBACK_MEDIA_SOURCE
    : { uri: currentImage };

  return (
    <View
      {...panResponder.panHandlers}
      style={{
        width: '100%',
        aspectRatio: frameAspectRatio,
        position: 'relative',
        backgroundColor: '#F5F5F7',
      }}
    >
      {/* Main Image */}
      <Image
        source={currentImageSource}
        contentFit={failedImages[currentImage] ? 'cover' : 'contain'}
        transition={200}
        style={{ width: '100%', height: '100%' }}
        onError={failedImages[currentImage] ? undefined : () => handleImageError(currentImage)}
      />

      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: heartOpacity,
          transform: [{ scale: heartScale }],
          zIndex: 20,
        }}
      >
        <Ionicons name="heart" size={96} color="rgba(255,255,255,0.95)" />
      </Animated.View>

      {/* Previous Button */}
      {currentIndex > 0 && (
        <View
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: [{ translateY: -20 }],
            zIndex: 10,
          }}
        >
          <View
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              borderRadius: 20,
              padding: 8,
            }}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </View>
        </View>
      )}

      {/* Next Button */}
      {currentIndex < normalizedImages.length - 1 && (
        <View
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: [{ translateY: -20 }],
            zIndex: 10,
          }}
        >
          <View
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              borderRadius: 20,
              padding: 8,
            }}
          >
            <Ionicons name="chevron-forward" size={24} color="white" />
          </View>
        </View>
      )}

      {/* Image Counter */}
      {normalizedImages.length > 1 && (
        <View
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
            zIndex: 10,
          }}
        >
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }}>
            {currentIndex + 1} / {normalizedImages.length}
          </Text>
        </View>
      )}

      {/* Dots Indicator */}
      {normalizedImages.length > 1 && (
        <View
          style={{
            position: 'absolute',
            bottom: 12,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 6,
            zIndex: 10,
          }}
        >
          {normalizedImages.map((_, idx) => (
            <View
              key={`dot-${idx}`}
              style={{
                width: idx === currentIndex ? 8 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: idx === currentIndex ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.5)',
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
