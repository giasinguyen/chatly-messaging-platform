import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { reelService } from '@/services/reel.service';
import type { PostVisibility } from '@/types/post';
import { useAuthStore } from '@/store/auth.store';
import { getApiErrorMessage } from '@/utils/errorHandler';

interface CreateReelModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface SelectedVideo {
  uri: string;
  name: string;
  type: string;
}

export function CreateReelModal({ visible, onClose, onCreated }: CreateReelModalProps) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);

  const visibilityOptions = useMemo(
    (): { value: PostVisibility; label: string; icon: string }[] => [
      { value: 'PUBLIC', label: t('mobile.reels.visibility_everyone'), icon: 'earth-outline' },
      { value: 'FRIENDS_ONLY', label: t('mobile.reels.visibility_friends'), icon: 'people-outline' },
      { value: 'ONLY_ME', label: t('mobile.reels.visibility_only_me'), icon: 'lock-closed-outline' },
    ],
    [t],
  );
  const [video, setVideo] = useState<SelectedVideo | null>(null);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('PUBLIC');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisibilityOpen, setIsVisibilityOpen] = useState(false);

  // Video preview player
  const player = useVideoPlayer(video ? { uri: video.uri } : null, (videoPlayer) => {
    videoPlayer.loop = true;
  });

  useEffect(() => {
    if (video) {
      player.play();
    } else {
      player.pause();
    }
  }, [video, player]);

  const handleClose = () => {
    if (isSubmitting) return;
    setVideo(null);
    setCaption('');
    setVisibility('PUBLIC');
    setIsVisibilityOpen(false);
    onClose();
  };

  const handlePickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('mobile.reels.video_permission_title'), t('mobile.reels.video_permission_body'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 0.9,
      shouldDownloadFromNetwork: true,
    } as any);

    if (result.canceled) return;

    const picked = result.assets[0];
    if (picked.fileSize && picked.fileSize > 20 * 1024 * 1024) {
      Alert.alert(t('mobile.common.info'), t('mobile.reels.video_size_warning'));
      return;
    }

    setVideo({
      uri: picked.uri,
      name: picked.fileName ?? `reel-video-${Date.now()}.mp4`,
      type: picked.mimeType ?? 'video/mp4',
    });
  };

  const handleSubmit = async () => {
    if (!video) {
      Alert.alert(t('mobile.common.info'), t('mobile.reels.select_video_warning'));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await reelService.create({
        video,
        caption: caption.trim(),
        visibility,
      });

      if (response.code === 1000) {
        Alert.alert(t('mobile.common.success'), t('mobile.reels.create_success'));
        onCreated();
        handleClose();
      } else {
        Alert.alert(t('errors.request_failed'), response.message ?? t('mobile.reels.create_failed'));
      }
    } catch (error: unknown) {
      Alert.alert(t('errors.request_failed'), getApiErrorMessage(error, t('mobile.reels.create_failed')));
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentVisibilityOption = visibilityOptions.find((opt) => opt.value === visibility);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <TouchableOpacity activeOpacity={1} onPress={handleClose} className="absolute inset-0" />

        <View className="bg-white rounded-t-3xl h-[85%] w-full overflow-hidden">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
            <Text className="text-lg font-bold text-gray-900">{t('mobile.reels.create_modal_title')}</Text>
            <TouchableOpacity onPress={handleClose} disabled={isSubmitting} activeOpacity={0.7} className="p-1">
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1">
            <ScrollView contentContainerStyle={{ padding: 16 }} className="flex-1">
              {/* Creator profile */}
              <View className="flex-row items-center gap-3 mb-5">
                <View className="h-10 w-10 rounded-full overflow-hidden bg-gray-200">
                  {currentUser?.avatarUrl ? (
                    <Image
                      source={{ uri: currentUser.avatarUrl }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center bg-gray-400">
                      <Text className="text-white text-sm font-semibold">
                        {(currentUser?.displayName ?? 'U').slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <View>
                  <Text className="text-sm font-bold text-gray-900">
                    {currentUser?.displayName ?? t('mobile.reels.your_profile')}
                  </Text>
                  <Text className="text-xs text-gray-500">{currentUser?.email ?? ''}</Text>
                </View>
              </View>

              {/* Video picker preview box */}
              <View className="flex-row gap-4 mb-5">
                <View className="w-28 aspect-[9/16] rounded-xl bg-gray-100 border border-gray-200 overflow-hidden relative justify-center items-center">
                  {video ? (
                    <>
                      <VideoView
                        player={player}
                        contentFit="cover"
                        nativeControls={false}
                        style={{ width: '100%', height: '100%' }}
                      />
                      <TouchableOpacity
                        onPress={() => setVideo(null)}
                        disabled={isSubmitting}
                        activeOpacity={0.7}
                        className="absolute right-1 top-1 bg-black/60 rounded-full p-1 border border-white/20">
                        <Ionicons name="close" size={12} color="white" />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      onPress={handlePickVideo}
                      activeOpacity={0.7}
                      className="flex-1 items-center justify-center p-2">
                      <Ionicons name="film-outline" size={24} color={Colors.textMuted} />
                      <Text className="text-[10px] text-gray-500 font-medium mt-1 text-center">
                        {t('mobile.reels.select_video')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Description Input */}
                <View className="flex-1 gap-1">
                  <Text className="text-xs font-semibold text-gray-500">{t('mobile.reels.description')}</Text>
                  <TextInput
                    value={caption}
                    onChangeText={setCaption}
                    placeholder={t('mobile.reels.caption_placeholder')}
                    multiline
                    maxLength={1000}
                    editable={!isSubmitting}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-900 max-h-32"
                    style={{ textAlignVertical: 'top' }}
                  />
                  <Text className="text-[10px] text-gray-400 align-right self-end">
                    {caption.length}/1000
                  </Text>
                </View>
              </View>

              {/* Privacy settings */}
              <View className="mb-4">
                <Text className="text-xs font-semibold text-gray-500 mb-1.5">{t('mobile.reels.visibility')}</Text>
                <TouchableOpacity
                  onPress={() => setIsVisibilityOpen((open) => !open)}
                  activeOpacity={0.7}
                  className="flex-row items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <View className="flex-row items-center gap-2">
                    <Ionicons
                      name={currentVisibilityOption?.icon as any}
                      size={18}
                      color={Colors.text}
                    />
                    <Text className="text-sm font-semibold text-gray-900">
                      {currentVisibilityOption ? t(currentVisibilityOption.labelKey) : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
                </TouchableOpacity>

                {/* Visibility Dropdown Drawer */}
                {isVisibilityOpen && (
                  <View className="bg-gray-50 border-x border-b border-gray-200 rounded-b-xl -mt-1 overflow-hidden">
                    {visibilityOptions.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => {
                          setVisibility(opt.value);
                          setIsVisibilityOpen(false);
                        }}
                        activeOpacity={0.7}
                        className={`flex-row items-center gap-2.5 px-4 py-3 border-t border-gray-200/50 ${
                          visibility === opt.value ? 'bg-blue-50/40' : ''
                        }`}>
                        <Ionicons
                          name={opt.icon as any}
                          size={18}
                          color={visibility === opt.value ? '#3B82F6' : Colors.textMuted}
                        />
                        <Text
                          className={`text-sm ${
                            visibility === opt.value ? 'text-blue-600 font-bold' : 'text-gray-700'
                          }`}>
                          {t(opt.labelKey)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View className="flex-row gap-3 border-t border-gray-200 bg-white px-4 pb-8 pt-4">
              <TouchableOpacity
                onPress={handleClose}
                disabled={isSubmitting}
                className="flex-1 items-center justify-center rounded-2xl bg-gray-100 py-3.5">
                <Text className="text-sm font-bold text-gray-800">{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting || !video}
                className={`flex-1 items-center justify-center rounded-2xl py-3.5 ${
                  isSubmitting || !video ? 'bg-blue-300' : 'bg-blue-500'
                }`}>
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-sm font-bold text-white">{t('mobile.reels.publish')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}
