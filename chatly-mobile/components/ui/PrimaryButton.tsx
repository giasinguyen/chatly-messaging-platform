import { TouchableOpacity, Text, ActivityIndicator, type TouchableOpacityProps } from 'react-native';
import { Colors } from '@/constants/theme';

interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
}

export function PrimaryButton({
  title,
  loading = false,
  variant = 'primary',
  disabled,
  ...props
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  const bgStyle = {
    primary: { backgroundColor: isDisabled ? Colors.textLight : Colors.cta },
    outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.cta },
    ghost: { backgroundColor: 'transparent' },
  };

  const textColor = {
    primary: Colors.white,
    outline: Colors.cta,
    ghost: Colors.cta,
  };

  return (
    <TouchableOpacity
      className="items-center justify-center rounded-xl"
      style={[
        {
          height: 50,
          ...bgStyle[variant],
        },
      ]}
      activeOpacity={0.8}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColor[variant]} />
      ) : (
        <Text
          className="text-base font-semibold"
          style={{ color: textColor[variant] }}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
