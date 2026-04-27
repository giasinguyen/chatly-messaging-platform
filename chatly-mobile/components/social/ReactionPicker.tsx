import { useEffect } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay,
} from "react-native-reanimated";
import { REACTION_EMOJIS } from "@/constants/social";
import type { ReactionType } from "@/types/post";

interface ReactionPickerProps {
    visible: boolean;
    onSelect: (type: ReactionType) => void;
    onDismiss: () => void;
}

const SPRING_CONFIG = { damping: 14, stiffness: 220 };
const ENTRY_DELAY_MS = 30;

function AnimatedEmoji({
    emoji,
    label,
    type,
    index,
    onSelect,
}: {
    emoji: string;
    label: string;
    type: ReactionType;
    index: number;
    onSelect: (type: ReactionType) => void;
}) {
    const scale = useSharedValue(0);
    const translateY = useSharedValue(12);

    useEffect(() => {
        scale.value = withDelay(index * ENTRY_DELAY_MS, withSpring(1, SPRING_CONFIG));
        translateY.value = withDelay(index * ENTRY_DELAY_MS, withSpring(0, SPRING_CONFIG));
    }, [index, scale, translateY]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }, { translateY: translateY.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(1.3, SPRING_CONFIG);
    };
    const handlePressOut = () => {
        scale.value = withSpring(1, SPRING_CONFIG);
    };

    return (
        <Animated.View style={animatedStyle}>
            <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={() => onSelect(type)}
                accessibilityLabel={label}
                className="items-center px-1.5"
            >
                <Text className="text-3xl leading-9">{emoji}</Text>
            </Pressable>
        </Animated.View>
    );
}

export function ReactionPicker({ visible, onSelect, onDismiss }: ReactionPickerProps) {
    const containerScale = useSharedValue(0.8);
    const containerOpacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            containerScale.value = withSpring(1, SPRING_CONFIG);
            containerOpacity.value = withSpring(1, SPRING_CONFIG);
        } else {
            containerScale.value = withSpring(0.8, SPRING_CONFIG);
            containerOpacity.value = withSpring(0, SPRING_CONFIG);
        }
    }, [visible, containerScale, containerOpacity]);

    const containerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: containerScale.value }],
        opacity: containerOpacity.value,
    }));

    if (!visible) return null;

    return (
        <Modal transparent animationType="none" visible={visible} onRequestClose={onDismiss}>
            <Pressable className="flex-1" onPress={onDismiss}>
                <View className="flex-1 justify-end items-start pb-20 pl-4">
                    <Animated.View
                        style={containerStyle}
                        className="flex-row items-center bg-white rounded-full px-3 py-2.5 shadow-md border border-gray-100"
                    >
                        {REACTION_EMOJIS.map(({ type, emoji, label }, index) => (
                            <AnimatedEmoji
                                key={type}
                                type={type}
                                emoji={emoji}
                                label={label}
                                index={index}
                                onSelect={(t) => {
                                    onDismiss();
                                    onSelect(t);
                                }}
                            />
                        ))}
                    </Animated.View>
                </View>
            </Pressable>
        </Modal>
    );
}
