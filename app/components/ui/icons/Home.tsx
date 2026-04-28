import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";

interface IconProps extends SvgProps {
  color?: string;
  strokeWidth?: number;
}

const SvgHome = ({ color = "#000", strokeWidth = 0, ...props }: IconProps) => (
  <Svg viewBox="-5.00 -5.00 110.00 110.00" {...props}>
    <Path
      fill={color}
      stroke={color}
      strokeWidth={strokeWidth}
      d="new 0 0 100 100"
    />
  </Svg>
);
export default SvgHome;
