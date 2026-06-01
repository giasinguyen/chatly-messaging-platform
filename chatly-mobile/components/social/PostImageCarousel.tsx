import { Animated, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { usePostImageCarousel, FALLBACK_ASPECT_RATIO } from '@/hooks/usePostImageCarousel';

interface PostImageCarouselProps {
  images: string[];
  onDoubleTap?: () => void;
  onPressImage?: (index: number) => void;
}

const FALLBACK_MEDIA_SOURCE = require('@/assets/fallback-image.png');

export function PostImageCarousel({ images, onDoubleTap, onPressImage }: PostImageCarouselProps) {
  const {
    currentIndex,
    failedImages,
    frameAspectRatio,
    heartOpacity,
    heartScale,
    normalizedImages,
    panHandlers,
    handleFramePress,
    handleImageError,
  } = usePostImageCarousel({ images, onDoubleTap, onPressImage });

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
        }}>
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
      <Pressable
        {...panHandlers}
        onPress={handleFramePress}
        style={{ width: '100%', aspectRatio: frameAspectRatio, backgroundColor: '#F5F5F7' }}>
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
          }}>
          <Ionicons name="heart" size={96} color="rgba(255,255,255,0.95)" />
        </Animated.View>
      </Pressable>
    );
  }

  // Multiple images - show carousel
  const currentImage = normalizedImages[currentIndex];
  const currentImageSource = failedImages[currentImage]
    ? FALLBACK_MEDIA_SOURCE
    : { uri: currentImage };

  return (
    <Pressable
      {...panHandlers}
      onPress={handleFramePress}
      style={{
        width: '100%',
        aspectRatio: frameAspectRatio,
        position: 'relative',
        backgroundColor: '#F5F5F7',
      }}>
      {/* Main Image */}
      <Image
        source={currentImageSource}
        contentFit="cover"
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
        }}>
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
          }}>
          <View
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              borderRadius: 20,
              padding: 8,
            }}>
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
          }}>
          <View
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              borderRadius: 20,
              padding: 8,
            }}>
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
          }}>
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
          }}>
          {normalizedImages.map((_, idx) => (
            <View
              key={`dot-${idx}`}
              style={{
                width: idx === currentIndex ? 8 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor:
                  idx === currentIndex ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.5)',
              }}
            />
          ))}
        </View>
      )}
    </Pressable>
  );
}
