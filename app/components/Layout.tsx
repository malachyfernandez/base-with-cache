import React, { ReactNode } from 'react';
import LayoutDisplay, {
  LayoutDisplayRef,
  LayoutScreen,
  LayoutAction,
  ActionEvent,
  LayoutHoverInfo,
  LayoutNode,
  LayoutTheme,
  OKLCHColor,
  ScreenNode,
  SplitNode,
  ScreenSlotProps,
} from './LayoutDisplay';

export { LayoutContext, LayoutScreen } from './LayoutDisplay';
export type { LayoutHoverInfo, LayoutNode, SplitNode, ScreenNode, OKLCHColor, LayoutTheme, ActionEvent, ScreenSlotProps, LayoutAction };

/* ───────── Current action state machine ───────── */

export type CurrentAction =
  | { phase: 'idle' }
  | { phase: 'hover'; target: 'button' | 'screen' | 'gap'; id: string }
  | { phase: 'press'; target: 'button' | 'close' | 'gap'; id: string; x: number; y: number }
  | { phase: 'drag'; target: 'gap'; id: string };

type LayoutProps = {
  config: LayoutNode;
  children: ReactNode;
  theme?: Partial<LayoutTheme>;
  buttonIcon?: ReactNode;
  hoverDelayMs?: number;
  nextScreenTemplate?: string | number;
  onConfigChange?: (config: LayoutNode) => void;
  onHoverInfoChange?: (info: LayoutHoverInfo | null) => void;
  onActionStateChange?: (action: CurrentAction) => void;
};

const LayoutComponent = ({
  onActionStateChange,
  ...displayProps
}: LayoutProps) => {
  const displayRef = React.useRef<LayoutDisplayRef>(null);
  const currentActionRef = React.useRef<CurrentAction>({ phase: 'idle' });

  const reportAction = React.useCallback(
    (next: CurrentAction) => {
      currentActionRef.current = next;
      onActionStateChange?.(next);
    },
    [onActionStateChange],
  );

  const [outlineTarget, setOutlineTarget] = React.useState<string | null>(null);

  /* ───────── Hover logic ───────── */
  const handleHoverIn = React.useCallback(
    (event: ActionEvent & { type: 'hover-in' }) => {
      const isPreviewTarget = event.target === 'button' || event.target === 'gap';
      let nextOutlineTarget = event.id;
      if (isPreviewTarget && event.action) {
        nextOutlineTarget = displayRef.current?.showPreview(event.action) ?? event.id;
      }
      setOutlineTarget(nextOutlineTarget);
      reportAction({ phase: 'hover', target: event.target, id: event.id });
    },
    [reportAction],
  );

  const handleHoverOut = React.useCallback(() => {
    displayRef.current?.hidePreview();
    setOutlineTarget(null);
    reportAction({ phase: 'idle' });
  }, [reportAction]);

  /* ───────── Press logic ───────── */
  const handlePressStart = React.useCallback(
    (event: ActionEvent & { type: 'press-start' }) => {
      const isPreviewTarget = event.target === 'button' || event.target === 'gap';
      if (isPreviewTarget && event.action) {
        displayRef.current?.showPreview(event.action);
      }
      reportAction({ phase: 'press', target: event.target, id: event.id, x: event.x, y: event.y });
    },
    [reportAction],
  );

  const handlePressEnd = React.useCallback(
    (event: ActionEvent & { type: 'press-end' }) => {
      const current = currentActionRef.current;
      const isSameAction = current.phase === 'press' && current.id === event.id;

      if (isSameAction) {
        if (event.target === 'close') {
          displayRef.current?.closeScreen(event.id);
        } else if (event.action) {
          /* Button or gap press completed → create the screen */
          displayRef.current?.executeAction(event.action);
        }
      }

      /* Close handles its own cleanup; hidePreview otherwise */
      if (event.target !== 'close') {
        displayRef.current?.hidePreview();
      }

      reportAction({ phase: 'idle' });
    },
    [reportAction],
  );

  /* ───────── Drag logic ───────── */
  const handleDragStart = React.useCallback(
    (event: ActionEvent & { type: 'drag-start' }) => {
      const current = currentActionRef.current;
      if (current.phase === 'press' && current.id === event.id) {
        displayRef.current?.hidePreview();
        reportAction({ phase: 'drag', target: 'gap', id: event.id });
      }
    },
    [reportAction],
  );

  const handleDragEnd = React.useCallback(() => {
    reportAction({ phase: 'idle' });
  }, [reportAction]);

  /* ───────── Dispatcher ───────── */
  const handleActionEvent = React.useCallback(
    (event: ActionEvent) => {
      switch (event.type) {
        case 'hover-in':
          handleHoverIn(event);
          break;
        case 'hover-out':
          handleHoverOut();
          break;
        case 'press-start':
          handlePressStart(event);
          break;
        case 'press-end':
          handlePressEnd(event);
          break;
        case 'drag-start':
          handleDragStart(event);
          break;
        case 'drag-end':
          handleDragEnd();
          break;
      }
    },
    [handleHoverIn, handleHoverOut, handlePressStart, handlePressEnd, handleDragStart, handleDragEnd],
  );

  return (
    <LayoutDisplay
      ref={displayRef}
      {...displayProps}
      outlineTarget={outlineTarget}
      onActionEvent={handleActionEvent}
    />
  );
};

(LayoutComponent as any).Screen = LayoutScreen;

const Layout = LayoutComponent as React.FC<LayoutProps> & { Screen: typeof LayoutScreen };

export default Layout;

