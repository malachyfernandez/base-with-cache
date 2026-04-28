import * as React from "react";
import Svg, { Path, Circle } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgGroup2 = (props: SvgProps) => (
  <Svg
    width={154}
    height={60}
    fill="none"
    {...props}
  >
    <Path
      stroke="#9A7A33"
      strokeWidth={2}
      d="M1.052 59.836c-.333-8.5 0-30.562 31-32.5 25.6-1.6 40.667-13 45-24.5 4.334 11.5 18.9 22.9 44.5 24.5 31 1.938 31.334 24 31 32.5m-81-41.5-1.5-2m12.5 2 1.5-2m-7-2.5v2.5M71.552 27.336l-1.5 2m12.5-2 1.5 2m-7 2v-2.5"
    />
    <Path
      stroke="#9A7A33"
      strokeWidth={2}
      d="M77.052 18.336c2.413 0 4.293 1.292 5.621 2.69a13 13 0 0 1 1.689 2.226l-.112.138c-.327.382-.82.897-1.471 1.41-1.303 1.029-3.216 2.036-5.727 2.036-2.51 0-4.423-1.007-5.726-2.035a10.5 10.5 0 0 1-1.47-1.411q-.062-.073-.114-.138.084-.143.194-.314c.335-.524.836-1.22 1.495-1.912 1.329-1.398 3.21-2.69 5.621-2.69Z"
    />
    <Circle cx={77.052} cy={22.836} r={3} fill="#9A7A33" />
  </Svg>
);
export default SvgGroup2;
