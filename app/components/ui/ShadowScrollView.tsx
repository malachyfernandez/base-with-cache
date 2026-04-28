import React from 'react';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView } from 'react-native';

interface ShadowScrollViewProps {
  children: React.ReactNode;
  className?: string;
  scrollViewClassName?: string;
  direction?: 'vertical' | 'horizontal';
  topFade?: number;
  bottomFade?: number;
  leftFade?: number;
  rightFade?: number;
  extensionPercent?: number;
  horizontal?: boolean;
  onScroll?: (event: any) => void;
  scrollEventThrottle?: number;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
  style?: any;
  contentContainerStyle?: any;
  scrollViewComponent?: React.ComponentType<any>;
  [key: string]: any;
}

const ShadowScrollView = React.forwardRef<any, ShadowScrollViewProps>(({
  children,
  className,
  scrollViewClassName,
  horizontal,
  scrollViewComponent: ScrollViewComponent = ScrollView,
  ...scrollViewProps
}, ref) => {
  return (
    <ScrollShadow LinearGradientComponent={LinearGradient} className={className}>
      <ScrollViewComponent
        ref={ref}
        className={scrollViewClassName}
        horizontal={horizontal}
        {...scrollViewProps}
      >
        {children}
      </ScrollViewComponent>
    </ScrollShadow>
  );
});

export default ShadowScrollView;
