import React from 'react';
import { LayoutChangeEvent, Text, View } from 'react-native';

function hueFromId(id: string | number | undefined) {
  if (id === undefined) return 0;
  const num = typeof id === 'number' ? id : parseInt(id, 10) || 0;
  return (num * 25) % 360;
}

export const DemoContent = ({ text, screenId }: { text: string; screenId?: string | number }) => {
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const hue = hueFromId(screenId);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSizeRef = React.useRef(size);

  React.useEffect(() => {
    latestSizeRef.current = size;
  }, [size]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleLayout = React.useCallback((event: LayoutChangeEvent) => {
    const nextSize = {
      width: Math.round(event.nativeEvent.layout.width),
      height: Math.round(event.nativeEvent.layout.height),
    };

    if (latestSizeRef.current.width === nextSize.width && latestSizeRef.current.height === nextSize.height) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setSize(nextSize);
      latestSizeRef.current = nextSize;
      timeoutRef.current = null;
    }, 80);
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: `hsl(${hue}, 60%, 10%)`,
        justifyContent: 'center',
        alignItems: 'center',
      }}
      onLayout={handleLayout}
    >
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 12,
          backgroundColor: 'rgba(255,255,255,0.7)',
          alignItems: 'center',
        }}
        className='hover:brightness-75'
      >
        <Text style={{ color: `hsl(${hue}, 50%, 30%)`, fontWeight: '600' }}>
          {text}
          {screenId !== undefined ? ` ${String(screenId)}` : ''}
        </Text>
        <Text style={{ color: `hsl(${hue}, 40%, 45%)`, fontSize: 12 }}>
          {Math.round(size.width)} x {Math.round(size.height)}
        </Text>
      </View>
    </View>
  );
};
