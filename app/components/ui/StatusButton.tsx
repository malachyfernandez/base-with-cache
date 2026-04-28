import { useEffect, useState } from 'react';
import { View } from 'react-native';
import AppButton from './buttons/AppButton';
import FontText from './text/FontText';

interface StatusButtonProps {
  buttonText: string;
  buttonAltText: string;
  className?: string;
}

export default function StatusButton({ buttonText, buttonAltText, className }: StatusButtonProps) {

  const [trueButtonText, setTrueButtonText] = useState(buttonText);
  const [shakeOffset, setShakeOffset] = useState(0);

  const buttonPress = () => {
    setTrueButtonText(buttonAltText);
    
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

  useEffect(() => {

    let timer: NodeJS.Timeout;

    if (trueButtonText === buttonAltText) {
      timer = setTimeout(() => {
        setTrueButtonText(buttonText);
      }, 1000);
    }

    return () => clearTimeout(timer);
  }, [trueButtonText, buttonAltText]);

  return (
    <View className={`transition-all ${className || ''}`} style={{ transform: [{ translateX: shakeOffset }] }}>
      <AppButton variant="grey" className={`h-10 w-28 ${className || ''}`} onPress={buttonPress}>
        <FontText weight='medium' color='white'>{trueButtonText}</FontText>
      </AppButton>
    </View>
  );
}
