import Svg, { Path, SvgProps } from 'react-native-svg';

export function MonoIconsOptionsHorizontal(props: SvgProps) {
  return (
    <Svg width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      {/* Icon from Mono Icons by Mono - https://github.com/mono-company/mono-icons/blob/master/LICENSE.md */}
      <Path fill="currentColor" d="M12 14a2 2 0 1 0 0-4a2 2 0 0 0 0 4m-6 0a2 2 0 1 0 0-4a2 2 0 0 0 0 4m12 0a2 2 0 1 0 0-4a2 2 0 0 0 0 4" />
    </Svg>
  );
}

export default MonoIconsOptionsHorizontal;
