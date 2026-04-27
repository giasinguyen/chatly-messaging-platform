import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from "react-native-reanimated";
import { ReactionPicker } from "./ReactionPicker";
import { usePostReaction } from "@/hooks/usePostReaction";
import { REACTION_PICKER_LONG_PRESS_MS, REACTION_EMOJIS } from "@/constants/social";
import type { Post, ReactionType } from "@/types/post";

interface PostReactionButtonProps {
    post: Post;
    onPostUpdated: (updated: Post) => void;
}

const DEFAULT_EMOJI = "👍";
const SPRING_CONFIG = { damping: 15, stiffness: 260 };

function reactionEmoji(type: ReactionType | null): string {
    if (!type) return DEFAULT_EMOJI;
    return REACTION_EMOJIS.find((r) => r.type === type)?.emoji ?? DEFAULT_EMOJI;
}

export function PostReactionButton({ post, onPostUpdated }: PostReactionButtonProps) {
    const [pickerVisible, setPickerVisible] = useState(false);

    const { currentReaction, handleReact, handleRemoveReaction, isLoading } = usePostReaction({
        post,
        onPostUpdated,
    });

    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const totalReactions = post.reactions.reduce((acc, r) => acc + r.count, 0);

    const longPress = Gesture.LongPress()
        .minDuration(REACTION_PICKER_LONG_PRESS_MS)
        .onStart(() => {
            "worklet";
            scale.value = withSpring(0.85, SPRING_CONFIG);
        })
        .onEnd(() => {
            "worklet";
            scale.value = withSpring(1, SPRING_CONFIG);
        })
        .runOnJS(true)
        .onEnd(() => setPickerVisible(true));

    const tap = Gesture.Tap()
        .onStart(() => {
            "worklet";
            scale.value = withSpring(0.88, SPRING_CONFIG, () => {
                scale.value = withSpring(1, SPRING_CONFIG);
            });
        })
        .runOnJS(true)
        .onEnd(() => {
            if (currentReaction) {
                handleRemoveReaction();
            } else {
                handleReact("LIKE");
            }
        });

    const composed = Gesture.Exclusive(longPress, tap);

    return (
        <View className="items-center">
            <GestureDetector gesture={composed}>
                <Animated.View style={animatedStyle}>
                    <Pressable
                        disabled={isLoading}
                        className="flex-row items-center gap-1 px-3 py-2 rounded-xl"
                        accessibilityLabel={currentReaction ? currentReaction : "React"}
                        accessibilityRole="button"
                    >
                        <Text className="text-xl">{reactionEmoji(currentReaction)}</Text>
                        {totalReactions > 0 && (
                            <Text
                                className={
                                    currentReaction
                                        ? "text-xs font-semibold text-indigo-600"
                                        : "text-xs text-gray-500"
                                }
                            >
                                {totalReactions}
                            </Text>
                        )}
                    </Pressable>
                </Animated.View>
            </GestureDetector>

            <ReactionPicker
                visible={pickerVisible}
                onSelect={(type: ReactionType) => handleReact(type)}
                onDismiss={() => setPickerVisible(false)}
            />
        </View>
    );
}
