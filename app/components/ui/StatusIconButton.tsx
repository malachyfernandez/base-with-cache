import { useEffect, useState } from 'react';
import { View } from 'react-native';
import AppButton from './buttons/AppButton';

interface StatusIconButtonProps {
  icon: React.ReactNode;
  className?: string;
  variant?: 'grey' | 'none';
  onPress?: () => void;
}

export default function StatusIconButton({ icon, className, variant = 'grey', onPress }: StatusIconButtonProps) {

  const [shakeOffset, setShakeOffset] = useState(0);

  const buttonPress = () => {
    // Call the custom onPress if provided
    if (onPress) {
      onPress();
    }
    
    // Shake animation with setInterval
    let shakeCount = 0;
    const shakePositions = [5, -5, 5, -5, 0]; // Right, left, right, left, center
    
    const interval = setInterval(() => {
      if (shakeCount < shakePositions.length) {
        setShakeOffset(shakePositions[shakeCount]);
        shakeCount++;
      } else {
        clearInterval(interval);
      }
    }, 100);
  };

  return (
    <View className={`transition-all ${className || ''}`} style={{ transform: [{ translateX: shakeOffset }] }}>
      <AppButton variant={variant} className={`h-10 w-10 ${className || ''}`} onPress={buttonPress}>
        {icon}
      </AppButton>
    </View>
  );
}
