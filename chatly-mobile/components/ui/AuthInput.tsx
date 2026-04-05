import { forwardRef } from 'react';
import { View, TextInput as RNTextInput, Text, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface AuthInputProps extends TextInputProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
}

export const AuthInput = forwardRef<RNTextInput, AuthInputProps>(
  ({ label, icon, error, ...props }, ref) => {
    return (
      <View className="mb-4">
        <Text className="mb-1.5 text-sm font-medium" style={{ color: Colors.text }}>
          {label}
        </Text>
        <View
          className="flex-row items-center rounded-xl border px-4"
          style={{
            borderColor: error ? Colors.error : Colors.borderLight,
            backgroundColor: Colors.white,
            height: 50,
          }}
        >
          {icon && (
            <Ionicons
              name={icon}
              size={20}
              color={error ? Colors.error : Colors.textMuted}
              style={{ marginRight: 10 }}
            />
          )}
          <RNTextInput
            ref={ref}
            className="flex-1 text-base"
            style={{ color: Colors.text }}
            placeholderTextColor={Colors.textLight}
            autoCapitalize="none"
            {...props}
          />
        </View>
        {error && (
          <Text className="mt-1 text-xs" style={{ color: Colors.error }}>
            {error}
          </Text>
        )}
      </View>
    );
  },
);
