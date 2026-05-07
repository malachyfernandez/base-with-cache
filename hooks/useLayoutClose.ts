import { useContext } from 'react';
import { LayoutContext } from '../app/components/Layout';

export function useLayoutClose() {
  const { onCloseScreen } = useContext(LayoutContext);
  return onCloseScreen;
}
