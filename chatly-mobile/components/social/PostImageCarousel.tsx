import { useState, useRef, useEffect } from 'react';
import { View, Dimensions, Animated, PanResponder, Text } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface PostImageCarouselProps {
  images: string[];
  aspectRatio?: number;
}

const { width: screenWidth } = Dimensions.get('window');

export function PostImageCarousel({ images, aspectRatio = 1 }: PostImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => images.length > 1,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 8 && Math.abs(gestureState.dy) < 12 && images.length > 1,
      onPanResponderRelease: (evt, { vx }) => {
        const idx = currentIndexRef.current;
        // vx is velocity in x direction
        if (vx > 0.5 && idx > 0) {
          // Swipe right - show previous image
          setCurrentIndex((i) => Math.max(0, i - 1));
        } else if (vx < -0.5 && idx < images.length - 1) {
          // Swipe left - show next image
          setCurrentIndex((i) => Math.min(images.length - 1, i + 1));
        }
      },
    }),
  ).current;

  const handlePrevious = () => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  };

  const handleNext = () => {
    setCurrentIndex((i) => Math.min(images.length - 1, i + 1));
  };

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  if (!images || images.length === 0) {
    return (
      <View
        style={{
          width: '100%',
          aspectRatio,
          backgroundColor: '#F5F5F7',
        }}
      />
    );
  }

  // Single image - just display
  if (images.length === 1) {
    return (
      <Image
        source={{ uri: images[0] }}
        contentFit="cover"
        transition={120}
        style={{ width: '100%', aspectRatio }}
      />
    );
  }

  // Multiple images - show carousel
  const currentImage = images[currentIndex];

  return (
    <View
      {...panResponder.panHandlers}
      style={{
        width: '100%',
        aspectRatio,
        position: 'relative',
        backgroundColor: '#F5F5F7',
      }}
    >
      {/* Main Image */}
      <Image
        source={{ uri: currentImage }}
        contentFit="cover"
        transition={200}
        style={{ width: '100%', aspectRatio }}
      />

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
      {currentIndex < images.length - 1 && (
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
      {images.length > 1 && (
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
            {currentIndex + 1} / {images.length}
          </Text>
        </View>
      )}

      {/* Dots Indicator */}
      {images.length > 1 && (
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
          {images.map((_, idx) => (
            <View
              key={`dot-${idx}`}
              style={{
                width: idx === currentIndex ? 8 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: idx === currentIndex ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.5)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
