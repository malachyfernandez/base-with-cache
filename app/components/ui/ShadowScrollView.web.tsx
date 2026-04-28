import React from 'react';
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
  direction,
  topFade,
  bottomFade,
  leftFade,
  rightFade,
  extensionPercent = 50,
  horizontal,
  scrollViewComponent: ScrollViewComponent = ScrollView,
  contentContainerStyle,
  ...scrollViewProps
}, ref) => {
  const resolvedDirection = direction ?? (horizontal ? 'horizontal' : 'vertical');
  const resolvedTopFade = topFade ?? (resolvedDirection === 'vertical' ? 24 : 0);
  const resolvedBottomFade = bottomFade ?? (resolvedDirection === 'vertical' ? 24 : 0);
  const resolvedLeftFade = leftFade ?? (resolvedDirection === 'horizontal' ? 24 : 0);
  const resolvedRightFade = rightFade ?? (resolvedDirection === 'horizontal' ? 24 : 0);

  const maskImage = `linear-gradient(
    to bottom,
    transparent 0px,
    black ${resolvedTopFade}px,
    black calc(100% - ${resolvedBottomFade}px),
    transparent 100%
  ), linear-gradient(
    to right,
    transparent 0px,
    black ${resolvedLeftFade}px,
    black calc(100% - ${resolvedRightFade}px),
    transparent 100%
  )`;

  const pct = extensionPercent / 100;

  const extendedStyles = {
    marginTop: -resolvedTopFade * pct,
    marginBottom: -resolvedBottomFade * pct,
    marginLeft: -resolvedLeftFade * pct,
    marginRight: -resolvedRightFade * pct,
  };

  const fadePadding = {
    paddingTop: resolvedTopFade * pct,
    paddingBottom: resolvedBottomFade * pct,
    paddingLeft: resolvedLeftFade * pct,
    paddingRight: resolvedRightFade * pct,
  };

  const mergedContentContainerStyle = React.useMemo(() => {
    if (!contentContainerStyle && !extensionPercent) return undefined;
    return {
      ...(contentContainerStyle || {}),
      ...fadePadding,
    };
  }, [contentContainerStyle, fadePadding, extensionPercent]);

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        ...extendedStyles,
        maskImage,
        WebkitMaskImage: maskImage,
        maskComposite: 'intersect',
        WebkitMaskComposite: 'source-in',
      }}
    >
      <ScrollViewComponent
        ref={ref}
        className={scrollViewClassName}
        contentContainerStyle={mergedContentContainerStyle}
        horizontal={horizontal}
        {...scrollViewProps}
      >
        {children}
      </ScrollViewComponent>
    </div>
  );
});

export default ShadowScrollView;
