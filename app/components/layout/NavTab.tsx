import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import FontText from '../ui/text/FontText';
import { ReactElement } from 'react';
import { useCSSVariable } from 'uniwind';

interface NavTabProps {
  text: string;
  children: React.ReactNode;
  isLast?: boolean;
  isInvisible?: boolean;
  isHighlighted?: boolean;
  onPress?: () => void;
}

const NavTab = ({ text, children, isLast = false, isInvisible = false, isHighlighted = false, onPress }: NavTabProps): React.ReactElement => {
  const accentColor = useCSSVariable('--color-accent');
  const textColor = useCSSVariable('--color-text');
  
  const clonedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as ReactElement<any>, {
        color: isHighlighted ? textColor : accentColor
      });
    }
    return child;
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`h-12 justify-center flex-2 border-accent border-t-2 border-x-2 rounded-t-4xl rounded-b-[1px] flex-col items-center gap-0 box-border ${isHighlighted ? 'bg-accent' : 'bg-none hover:bg-accent/20'} ${isInvisible ? 'opacity-0' : 'opacity-100'} min-w-0`}
    >
      {clonedChildren}
      {isHighlighted ? (
        <FontText className='text-xs shrink-0' color='text' weight='medium'>{text}</FontText>
      ) : (
        <FontText className='text-xs shrink-0' color='accent' weight='medium'>{text}</FontText>
      )}
    </TouchableOpacity>
  );
};

export default NavTab;
