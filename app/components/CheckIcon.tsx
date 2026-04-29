import React from 'react';
import { Plus } from 'lucide-react-native';

export const CheckIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = 'white' }) => {
  return <Plus size={size} color="#fff6" />;
};
