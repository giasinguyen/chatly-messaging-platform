import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  visible: boolean;
  onClose: () => void;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export function ImageLightbox({ images, initialIndex = 0, visible, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(initialIndex);

  // Sync index when reopened at different position
  useEffect(() => {
    if (visible) setIndex(initialIndex);
  }, [visible, initialIndex]);

  if (!visible || images.length === 0) return null;

  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(images.length - 1, i + 1));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <View style={styles.overlay}>
        {/* Tap background to close */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        {/* Image */}
        <TouchableWithoutFeedback>
          <Image
            source={{ uri: images[index] }}
            style={styles.image}
            resizeMode="contain"
          />
        </TouchableWithoutFeedback>

        {/* Prev button */}
        {index > 0 && (
          <TouchableOpacity style={styles.prevBtn} onPress={prev} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Next button */}
        {index < images.length - 1 && (
          <TouchableOpacity style={styles.nextBtn} onPress={next} activeOpacity={0.7}>
            <Ionicons name="chevron-forward" size={28} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Counter */}
        {images.length > 1 && (
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {index + 1} / {images.length}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: SCREEN_W,
    height: SCREEN_H * 0.82,
  },
  prevBtn: {
    position: 'absolute',
    left: 12,
    top: '50%',
    marginTop: -24,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 24,
    padding: 8,
  },
  nextBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -24,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 24,
    padding: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 52,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  counter: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  counterText: {
    color: '#fff',
    fontSize: 13,
  },
});
