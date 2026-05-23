import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Keyboard, View, Text, TextInput, TouchableOpacity } from 'react-native';
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
  showModeToggle?: boolean;
  editorKey?: string;
}

export interface TextRichComposerRef {
  blur: () => void;
  focus: (targetMode?: ComposerMode) => void;
}

export const TextRichComposer = forwardRef<TextRichComposerRef, TextRichComposerProps>(function TextRichComposer({
  mode,
  onModeChange,
  plainText,
  onPlainTextChange,
  richHtml,
  onRichHtmlChange,
  placeholder = 'Type a message...',
  minHeight = 44,
  showToolbar = true,
  showModeToggle = true,
  editorKey = 'default',
}, ref) {
  const editorRef = useRef<RichEditor>(null);
  const plainInputRef = useRef<TextInput>(null);

  const editorInitialHtml = useMemo(() => {
    if (richHtml.trim()) {
      return richHtml;
    }
    return '<p></p>';
  }, [richHtml]);

  useImperativeHandle(ref, () => ({
    blur: () => {
      plainInputRef.current?.blur();
      editorRef.current?.blurContentEditor();
      Keyboard.dismiss();
    },
    focus: (targetMode) => {
      if (targetMode === 'editor') {
        editorRef.current?.focusContentEditor();
        return;
      }
      plainInputRef.current?.focus();
    },
  }), []);

  return (
    <View style={{ width: '100%' }}>
      {showModeToggle && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            marginBottom: 4,
            gap: 6,
          }}>
          <TouchableOpacity
            onPress={() => onModeChange('plain')}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: mode === 'plain' ? Colors.ctaLight : Colors.bgCard,
              borderWidth: 1,
              borderColor: Colors.borderLight,
            }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.text }}>
              Text
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onModeChange('editor')}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: mode === 'editor' ? Colors.ctaLight : Colors.bgCard,
              borderWidth: 1,
              borderColor: Colors.borderLight,
            }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.text }}>
              Editor
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === 'plain' ? (
        <View
          style={{
            borderRadius: 18,
            backgroundColor: Colors.bgCard,
            minHeight,
            paddingHorizontal: 14,
            justifyContent: 'center',
          }}>
          <TextInput
            ref={plainInputRef}
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
          key={editorKey}
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: Colors.borderLight,
            backgroundColor: Colors.bgCard,
            overflow: 'hidden',
          }}>
          {showToolbar && (
            <RichToolbar
              key={`${editorKey}-toolbar`}
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
                backgroundColor: Colors.bg,
                borderBottomWidth: 0.5,
                borderBottomColor: Colors.borderLight,
              }}
            />
          )}
          <RichEditor
            key={`${editorKey}-editor`}
            ref={editorRef}
            initialContentHTML={editorInitialHtml}
            placeholder={placeholder}
            editorStyle={{
              backgroundColor: Colors.bgCard,
              color: Colors.text,
              placeholderColor: Colors.textLight,
              contentCSSText:
                'font-size: 15px; line-height: 1.4; color: #111827; white-space: pre-wrap;',
            }}
            style={{ minHeight }}
            onChange={(html) => onRichHtmlChange(html)}
            onInput={(payload: unknown) => {
              const inputText =
                typeof payload === 'string'
                  ? payload
                  : typeof payload === 'object' &&
                      payload !== null &&
                      'data' in payload &&
                      typeof payload.data === 'string'
                    ? payload.data
                    : '';

              if (!inputText || inputText === '\n') {
                onPlainTextChange('');
                return;
              }
              onPlainTextChange(richTextToPlainText(inputText));
            }}
          />
        </View>
      )}
    </View>
  );
});
