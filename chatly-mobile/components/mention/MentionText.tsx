import { Fragment } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { Colors } from '@/constants/theme';

interface MentionTextProps {
  content: string;
  style?: StyleProp<TextStyle>;
  mentionStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

const MENTION_REGEX = /(@AI|@[A-Za-z0-9_.-]+)/g;

export function MentionText({ content, style, mentionStyle, numberOfLines }: MentionTextProps) {
  const parts = content.split(MENTION_REGEX);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, index) => {
        if (!part) {
          return null;
        }

        if (MENTION_REGEX.test(part)) {
          MENTION_REGEX.lastIndex = 0;
          return (
            <Text
              key={`mention-${index}`}
              style={[{ fontWeight: '700', color: Colors.cta }, mentionStyle]}>
              {part}
            </Text>
          );
        }

        MENTION_REGEX.lastIndex = 0;
        return <Fragment key={`text-${index}`}>{part}</Fragment>;
      })}
    </Text>
  );
}