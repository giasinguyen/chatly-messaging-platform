import { Alert, type AlertButton } from 'react-native';
import i18n from '@/lib/i18n';
import { getApiErrorMessage } from '@/utils/errorHandler';

export function alertError(message: string, title?: string): void {
  Alert.alert(title ?? i18n.t('common.error'), message);
}

export function alertErrorFromUnknown(
  error: unknown,
  fallbackKey: string,
  title?: string,
): void {
  Alert.alert(
    title ?? i18n.t('common.error'),
    getApiErrorMessage(error, i18n.t(fallbackKey)),
  );
}

export function alertConfirm(
  title: string,
  message: string,
  buttons: AlertButton[],
): void {
  Alert.alert(title, message, buttons);
}
