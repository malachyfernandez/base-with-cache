import Row from 'app/components/layout/Row';
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';

interface Toast {
  id: string;
  message: string;
}

interface ToastContextType {
  showToast: (message: string) => void;
  hideToast: () => void;
  currentToast: Toast | null;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);


export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentToast, setCurrentToast] = useState<Toast | null>(null);
  const animationValue = useSharedValue(0);

  const showToast = (message: string) => {
    const id = Date.now().toString();
    setCurrentToast({ id, message });
    
    // Start animation
    animationValue.value = withTiming(1, { duration: 300 });
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      hideToast();
    }, 3000);
  };

  const hideToast = () => {
    // Animate out
    animationValue.value = withTiming(0, { duration: 300 }, () => {
      setCurrentToast(null);
    });
  };

  const animatedToastStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(animationValue.value, [0, 1], [0, 1]),
      transform: [
        {
          translateY: interpolate(animationValue.value, [0, 1], [100, 0]),
        },
      ],
    };
  });

  return (
    <ToastContext.Provider value={{ showToast, hideToast, currentToast }}>
      {children}
      {currentToast && (
        <Animated.View className="absolute left-0 right-0 bottom-0 items-center pb-12 z-50" style={animatedToastStyle}>
          <Row className="gap-0 bg-white pl-5 rounded-full min-h-12 h-min max-w-[90%] min-w-min shadow-lg shadow-black/10 items-center justify-center">
            
            <Text className="text-base">
              {currentToast.message}
            </Text>
            <Pressable onPress={hideToast} className="text-lg h-10 w-10 ml-[-0.3rem] rounded-full items-center justify-center">
              <Text>×</Text>
            </Pressable>
          </Row>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};
