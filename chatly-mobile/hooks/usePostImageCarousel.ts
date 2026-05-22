import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder } from 'react-native';
import { Image } from 'expo-image';
import { normalizeMediaUrl } from '@/utils/mediaUrl';

export const FALLBACK_ASPECT_RATIO = 1;

interface UsePostImageCarouselParams {
  images: string[];
  onDoubleTap?: () => void;
  onPressImage?: (index: number) => void;
}

export function usePostImageCarousel({ images, onDoubleTap, onPressImage }: UsePostImageCarouselParams) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageAspectRatios, setImageAspectRatios] = useState<Record<string, number>>({});
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const currentIndexRef = useRef(0);
  const lastTapRef = useRef(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  const normalizedImages = useMemo(
    () => images.map((uri) => normalizeMediaUrl(uri)).filter((uri): uri is string => Boolean(uri)),
    [images],
  );

  const triggerDoubleTap = () => {
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
    }

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

  const panResponder = useMemo(
    () =>
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
            if (tapTimeoutRef.current) {
              clearTimeout(tapTimeoutRef.current);
            }
            tapTimeoutRef.current = setTimeout(() => {
              tapTimeoutRef.current = null;
              onPressImage?.(idx);
            }, tapGapMs);
            return;
          }

          if (tapTimeoutRef.current) {
            clearTimeout(tapTimeoutRef.current);
            tapTimeoutRef.current = null;
          }

          if (vx > 0.5 && idx > 0) {
            setCurrentIndex((value) => Math.max(0, value - 1));
          } else if (vx < -0.5 && idx < normalizedImages.length - 1) {
            setCurrentIndex((value) => Math.min(normalizedImages.length - 1, value + 1));
          }
        },
      }),
    [normalizedImages.length, onDoubleTap, onPressImage, heartOpacity, heartScale],
  );

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
    ).then((ratios) => {
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

  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
    };
  }, []);

  const frameAspectRatio =
    normalizedImages.length === 1
      ? Math.min(...Object.values(imageAspectRatios), FALLBACK_ASPECT_RATIO)
      : FALLBACK_ASPECT_RATIO;

  const handleImageError = (uri: string) => {
    setFailedImages((prev) => ({ ...prev, [uri]: true }));
  };

  return {
    currentIndex,
    failedImages,
    frameAspectRatio,
    heartOpacity,
    heartScale,
    normalizedImages,
    panHandlers: panResponder.panHandlers,
    handleImageError,
    setCurrentIndex,
  };
}