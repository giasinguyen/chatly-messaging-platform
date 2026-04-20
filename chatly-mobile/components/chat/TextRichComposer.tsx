import { useMemo, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import {
  RichEditor,
  RichToolbar,
  actions,
} from 'react-native-pell-rich-editor';
import { Colors } from '@/constants/theme';
import { richTextToPlainText } from '@/utils/format';

export type ComposerMode = 'plain' | 'editor';

interface TextRichComposerProps {
  mode: ComposerMode;
  onModeChange: (mode: ComposerMode) => void;
  plainText: string;
  onPlainTextChange: (value: string) => void;
  richHtml: string;
  onRichHtmlChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  showToolbar?: boolean;
  editorKey?: string;
}

export function TextRichComposer({
  mode,
  onModeChange,
  plainText,
  onPlainTextChange,
  richHtml,
  onRichHtmlChange,
  placeholder = 'Type a message...',
  minHeight = 44,
  showToolbar = true,
  editorKey = 'default',
}: TextRichComposerProps) {
  const editorRef = useRef<RichEditor>(null);

  const editorInitialHtml = useMemo(() => {
    if (richHtml.trim()) {
      return richHtml;
    }
    return '<p></p>';
  }, [richHtml]);

  return (
    <View style={{ width: '100%' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 6,
          gap: 6,
        }}>
        <TouchableOpacity
          onPress={() => onModeChange('plain')}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
            backgroundColor: mode === 'plain' ? Colors.ctaLight : Colors.white,
            borderWidth: 1,
            borderColor: Colors.borderLight,
          }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.text }}>
            Text
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onModeChange('editor')}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
            backgroundColor: mode === 'editor' ? Colors.ctaLight : Colors.white,
            borderWidth: 1,
            borderColor: Colors.borderLight,
          }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.text }}>
            Editor
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'plain' ? (
        <View
          style={{
            borderRadius: 18,
            backgroundColor: Colors.white,
            minHeight,
            paddingHorizontal: 14,
            justifyContent: 'center',
          }}>
          <TextInput
            value={plainText}
            onChangeText={onPlainTextChange}
            placeholder={placeholder}
            placeholderTextColor={Colors.textLight}
            multiline
            textAlignVertical="center"
            style={{
              color: Colors.text,
              fontSize: 15,
              minHeight: minHeight - 10,
              maxHeight: 120,
            }}
          />
        </View>
      ) : (
        <View
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: Colors.borderLight,
            backgroundColor: Colors.white,
            overflow: 'hidden',
          }}>
          {showToolbar && (
            <RichToolbar
              editor={editorRef}
              selectedIconTint={Colors.cta}
              iconTint={Colors.textMuted}
              actions={[
                actions.setBold,
                actions.setItalic,
                actions.setUnderline,
                actions.setStrikethrough,
                actions.insertBulletsList,
                actions.insertOrderedList,
              ]}
              style={{
                backgroundColor: '#f8fafc',
                borderBottomWidth: 0.5,
                borderBottomColor: Colors.borderLight,
              }}
            />
          )}
          <RichEditor
            key={editorKey}
            ref={editorRef}
            initialContentHTML={editorInitialHtml}
            placeholder={placeholder}
            editorStyle={{
              backgroundColor: Colors.white,
              color: Colors.text,
              placeholderColor: Colors.textLight,
              contentCSSText:
                'font-size: 15px; line-height: 1.4; color: #111827; white-space: pre-wrap;',
            }}
            style={{ minHeight }}
            onChange={(html) => onRichHtmlChange(html)}
            onInput={(text) => {
              if (!text || text === '\n') {
                onPlainTextChange('');
                return;
              }
              onPlainTextChange(richTextToPlainText(text));
            }}
          />
        </View>
      )}
    </View>
  );
}
