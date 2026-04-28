import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

interface InstagramIconProps {
  size?: number;
  color?: string;
}

export function InstagramIcon({ size = 16, color = 'currentColor' }: InstagramIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5"
        stroke={color}
        strokeWidth="2"
      />
      <Circle
        cx="12"
        cy="12"
        r="4"
        stroke={color}
        strokeWidth="2"
      />
      <Circle
        cx="18"
        cy="6"
        r="1.5"
        fill={color}
      />
    </Svg>
  );
}

export default InstagramIcon;
