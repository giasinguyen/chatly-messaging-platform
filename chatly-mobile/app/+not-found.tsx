import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Container } from '@/components/Container';

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <View className={styles.container}>
      <Stack.Screen options={{ title: t('mobile.common.oops') }} />
      <Container>
        <Text className={styles.title}>{t('mobile.common.screen_not_found')}</Text>
        <Link href="/" className={styles.link}>
          <Text className={styles.linkText}>{t('mobile.common.go_home')}</Text>
        </Link>
      </Container>
    </View>
  );
}

const styles = {
  container: `flex flex-1 bg-white`,
  title: `text-xl font-bold`,
  link: `mt-4 pt-4`,
  linkText: `text-base text-[#2e78b7]`,
};
