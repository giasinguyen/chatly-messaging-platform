import { Fragment } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { Colors } from '@/constants/theme';
import { openAppAwareUrl } from '@/utils/appLinking';

interface MentionTextProps {
  content: string;
  style?: StyleProp<TextStyle>;
  mentionStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

const TEXT_TOKEN_REGEX = /(https?:\/\/[^\s<]+|www\.[^\s<]+|@AI|@[A-Za-z0-9_.-]+)/g;
const MENTION_REGEX = /^(@AI|@[A-Za-z0-9_.-]+)$/;
const URL_REGEX = /^(https?:\/\/[^\s<]+|www\.[^\s<]+)$/i;
const URL_PROTOCOL_REGEX = /^https?:\/\//i;
const URL_TRAILING_PUNCTUATION_REGEX = /[),.!?;:]+$/;

export function MentionText({ content, style, mentionStyle, numberOfLines }: MentionTextProps) {
  const parts = content.split(TEXT_TOKEN_REGEX);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, index) => {
        if (!part) {
          return null;
        }

        if (URL_REGEX.test(part)) {
          const linkText = part.replace(URL_TRAILING_PUNCTUATION_REGEX, '');
          const trailingText = part.slice(linkText.length);
          const href = URL_PROTOCOL_REGEX.test(linkText) ? linkText : `https://${linkText}`;

          return (
            <Fragment key={`link-${index}`}>
              <Text
                style={{ fontWeight: '700', color: '#9333EA' }}
                onPress={() => {
                  void openAppAwareUrl(href);
                }}>
                {linkText}
              </Text>
              {trailingText}
            </Fragment>
          );
        }

        if (MENTION_REGEX.test(part)) {
          return (
            <Text
              key={`mention-${index}`}
              style={[{ fontWeight: '700', color: Colors.cta }, mentionStyle]}>
              {part}
            </Text>
          );
        }

        return <Fragment key={`text-${index}`}>{part}</Fragment>;
      })}
    </Text>
  );
}
