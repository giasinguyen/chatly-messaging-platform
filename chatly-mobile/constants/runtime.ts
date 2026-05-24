import Constants from 'expo-constants';

export const IS_EXPO_GO = Constants.appOwnership === 'expo';
export const IS_CALL_SIGNALING_ENABLED = true;
export const IS_CALL_ENABLED = IS_CALL_SIGNALING_ENABLED;
export const IS_WEBRTC_CALL_ENABLED = !IS_EXPO_GO;
