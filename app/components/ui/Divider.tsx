import React from 'react';
import { View } from 'react-native';

interface DividerProps {
  percentFromEdge?: number;
  className?: string;
}

const Divider: React.FC<DividerProps> = ({ percentFromEdge = 5, className = '' }) => {
  const widthPercent = 100 - (percentFromEdge * 2);
  const marginPercent = percentFromEdge;
  
  return (
    <View 
      className={`h-px bg-slate-600 ${className}`}
      style={{ 
        width: `${widthPercent}%`, 
        marginLeft: `${marginPercent}%`,
        marginRight: `${marginPercent}%`
      }}
    />
  );
};

export default Divider;
