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

const layoutDebugLog = (..._args: unknown[]) => {};

/* ───────── Current action state machine ───────── */

export type CurrentAction =
  | { phase: 'idle' }
  | { phase: 'hover'; target: 'button' | 'screen' | 'gap'; id: string }
  | { phase: 'press'; target: 'button' | 'close' | 'gap'; id: string; x: number; y: number }
  | { phase: 'drag'; target: 'gap' | 'screen'; id: string };

type LayoutProps = {
  config: LayoutNode;
  children: ReactNode;
  theme?: Partial<LayoutTheme>;
  buttonIcon?: ReactNode;
  hoverDelayMs?: number;
  nextScreenTemplate?: string | number;
  addPageButtonsEnabled?: boolean;
  themeTransitionDurationMs?: number;
  onConfigChange?: (config: LayoutNode) => void;
  onHoverInfoChange?: (info: LayoutHoverInfo | null) => void;
  onActionStateChange?: (action: CurrentAction) => void;
  onSwapDrop?: (source: LayoutHoverInfo & { type: 'component' }, target: LayoutHoverInfo | null) => void;
};

const LayoutComponent = ({
  onActionStateChange,
  onHoverInfoChange,
  addPageButtonsEnabled = true,
  ...displayProps
}: LayoutProps) => {
  const displayRef = React.useRef<LayoutDisplayRef>(null);
  const currentActionRef = React.useRef<CurrentAction>({ phase: 'idle' });
  const outlineTargetRef = React.useRef<string | null>(null);
  const dragHoverTargetRef = React.useRef<{ target: 'button' | 'screen' | 'gap'; id: string } | null>(null);

  const reportAction = React.useCallback(
    (next: CurrentAction) => {
      currentActionRef.current = next;
      onActionStateChange?.(next);
    },
    [onActionStateChange],
  );

  const [outlineTarget, setOutlineTarget] = React.useState<string | null>(null);
  const updateOutlineTarget = React.useCallback((next: string | null) => {
    outlineTargetRef.current = next;
    setOutlineTarget(next);
  }, []);

  const handleHoverInfoChange = React.useCallback((info: LayoutHoverInfo | null) => {
    onHoverInfoChange?.(info);
    const current = currentActionRef.current;
    if (current.phase !== 'drag' || current.target !== 'screen' || outlineTargetRef.current !== 'cursor' || info?.type !== 'component') {
      return;
    }
    updateOutlineTarget(info.instanceId);
  }, [onHoverInfoChange, updateOutlineTarget]);

  /* ───────── Hover logic ───────── */
  const handleHoverIn = React.useCallback(
    (event: ActionEvent & { type: 'hover-in' }) => {
      layoutDebugLog('[Layout:handleHoverIn] START', { target: event.target, id: event.id, action: event.action?.key });
      const current = currentActionRef.current;
      layoutDebugLog('[Layout:handleHoverIn] current action', current);
      const isPreviewTarget = event.target === 'button' || event.target === 'gap';
      if (!addPageButtonsEnabled && isPreviewTarget) {
        layoutDebugLog('[Layout:handleHoverIn] ABORTED - add page buttons disabled, ignoring button/gap hover');
        return;
      }
      let nextOutlineTarget: string | null = null;
      if (isPreviewTarget && event.action) {
        const previewInstanceId = displayRef.current?.showPreview(event.action);
        layoutDebugLog('[Layout:handleHoverIn] preview shown', { previewInstanceId, actionKey: event.action.key });
        if (current.phase === 'drag' && current.target === 'screen') {
          nextOutlineTarget = previewInstanceId ?? event.id;
          layoutDebugLog('[Layout:handleHoverIn] screen drag - set outline', nextOutlineTarget);
        }
      } else {
        layoutDebugLog('[Layout:handleHoverIn] non-preview target - hiding preview');
        displayRef.current?.hidePreview();
      }
      if (current.phase === 'drag' && current.target === 'screen') {
        dragHoverTargetRef.current = { target: event.target, id: event.id };
        nextOutlineTarget = nextOutlineTarget ?? event.id;
        layoutDebugLog('[Layout:handleHoverIn] screen drag - final outline', nextOutlineTarget);
        updateOutlineTarget(nextOutlineTarget);
        return;
      }
      updateOutlineTarget(nextOutlineTarget);
      layoutDebugLog('[Layout:handleHoverIn] reporting hover action', { phase: 'hover', target: event.target, id: event.id });
      reportAction({ phase: 'hover', target: event.target, id: event.id });
    },
    [addPageButtonsEnabled, reportAction, updateOutlineTarget],
  );

  const handleHoverOut = React.useCallback((event: ActionEvent & { type: 'hover-out' }) => {
    layoutDebugLog('[Layout:handleHoverOut] START', { target: event.target, id: event.id });
    const current = currentActionRef.current;
    layoutDebugLog('[Layout:handleHoverOut] current action', current);
    const isPreviewTarget = event.target === 'button' || event.target === 'gap';
    if (!addPageButtonsEnabled && isPreviewTarget && current.phase !== 'drag') {
      layoutDebugLog('[Layout:handleHoverOut] ABORTED - add page buttons disabled, ignoring button/gap hover-out');
      return;
    }
    if (current.phase === 'drag' && current.target === 'screen') {
      const dragHoverTarget = dragHoverTargetRef.current;
      if (dragHoverTarget && (dragHoverTarget.target !== event.target || dragHoverTarget.id !== event.id)) {
        return;
      }
      dragHoverTargetRef.current = null;
      layoutDebugLog('[Layout:handleHoverOut] screen drag - hiding preview, setting cursor outline');
      displayRef.current?.hidePreview();
      updateOutlineTarget('cursor');
      return;
    }
    if (current.phase === 'hover' && (current.target !== event.target || current.id !== event.id)) {
      layoutDebugLog('[Layout:handleHoverOut] IGNORING - mismatch', { currentPhase: current.phase, currentTarget: current.target, currentId: current.id, eventTarget: event.target, eventId: event.id });
      return;
    }
    layoutDebugLog('[Layout:handleHoverOut] clearing preview and reporting idle');
    displayRef.current?.hidePreview();
    updateOutlineTarget(null);
    reportAction({ phase: 'idle' });
  }, [addPageButtonsEnabled, reportAction, updateOutlineTarget]);

  /* ───────── Press logic ───────── */
  const handlePressStart = React.useCallback(
    (event: ActionEvent & { type: 'press-start' }) => {
      layoutDebugLog('[Layout:handlePressStart] START', { target: event.target, id: event.id, action: event.action?.key });
      const isPreviewTarget = event.target === 'button' || event.target === 'gap';
      if (!addPageButtonsEnabled && isPreviewTarget) {
        layoutDebugLog('[Layout:handlePressStart] ABORTED - add page buttons disabled, ignoring button/gap press');
        return;
      }
      if (isPreviewTarget && event.action) {
        layoutDebugLog('[Layout:handlePressStart] showing preview for press');
        displayRef.current?.showPreview(event.action);
      }
      layoutDebugLog('[Layout:handlePressStart] reporting press action');
      reportAction({ phase: 'press', target: event.target, id: event.id, x: event.x, y: event.y });
    },
    [addPageButtonsEnabled, reportAction],
  );

  const handlePressEnd = React.useCallback(
    (event: ActionEvent & { type: 'press-end' }) => {
      layoutDebugLog('[Layout:handlePressEnd] START', { target: event.target, id: event.id });
      const current = currentActionRef.current;
      layoutDebugLog('[Layout:handlePressEnd] current action', current);
      const isPreviewTarget = event.target === 'button' || event.target === 'gap';
      if (!addPageButtonsEnabled && isPreviewTarget) {
        layoutDebugLog('[Layout:handlePressEnd] ABORTED - add page buttons disabled, ignoring button/gap press-end');
        return;
      }
      const isSameAction = current.phase === 'press' && current.id === event.id;
      layoutDebugLog('[Layout:handlePressEnd] isSameAction', isSameAction);

      if (isSameAction) {
        if (event.target === 'close') {
          layoutDebugLog('[Layout:handlePressEnd] closing screen');
          displayRef.current?.closeScreen(event.id);
        } else if (event.action) {
          /* Button or gap press completed → create the screen */
          layoutDebugLog('[Layout:handlePressEnd] executing action', event.action.key);
          displayRef.current?.executeAction(event.action);
        }
      }

      /* Close handles its own cleanup; hidePreview otherwise */
      if (event.target !== 'close') {
        layoutDebugLog('[Layout:handlePressEnd] hiding preview');
        displayRef.current?.hidePreview();
      }

      layoutDebugLog('[Layout:handlePressEnd] reporting idle');
      reportAction({ phase: 'idle' });
    },
    [addPageButtonsEnabled, reportAction],
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
    updateOutlineTarget(null);
    reportAction({ phase: 'idle' });
  }, [reportAction, updateOutlineTarget]);

  const handleSwapDragStart = React.useCallback((event: ActionEvent & { type: 'swap-drag-start' }) => {
    layoutDebugLog('[Layout:handleSwapDragStart] START', { id: event.id });
    dragHoverTargetRef.current = null;
    updateOutlineTarget('cursor');
    layoutDebugLog('[Layout:handleSwapDragStart] reporting screen drag');
    reportAction({ phase: 'drag', target: 'screen', id: event.id });
  }, [reportAction, updateOutlineTarget]);

  const handleSwapDragEnd = React.useCallback(() => {
    layoutDebugLog('[Layout:handleSwapDragEnd] START');
    dragHoverTargetRef.current = null;
    updateOutlineTarget(null);
    layoutDebugLog('[Layout:handleSwapDragEnd] reporting idle');
    reportAction({ phase: 'idle' });
  }, [reportAction, updateOutlineTarget]);

  /* ───────── Dispatcher ───────── */
  const handleActionEvent = React.useCallback(
    (event: ActionEvent) => {
      switch (event.type) {
        case 'hover-in':
          handleHoverIn(event);
          break;
        case 'hover-out':
          handleHoverOut(event);
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
        case 'swap-drag-start':
          handleSwapDragStart(event);
          break;
        case 'swap-drag-end':
          handleSwapDragEnd();
          break;
      }
    },
    [handleHoverIn, handleHoverOut, handlePressStart, handlePressEnd, handleDragStart, handleDragEnd, handleSwapDragStart, handleSwapDragEnd],
  );

  return (
    <LayoutDisplay
      ref={displayRef}
      {...displayProps}
      outlineTarget={outlineTarget}
      onHoverInfoChange={handleHoverInfoChange}
      onActionEvent={handleActionEvent}
    />
  );
};

(LayoutComponent as any).Screen = LayoutScreen;

const Layout = LayoutComponent as React.FC<LayoutProps> & { Screen: typeof LayoutScreen };

export default Layout;

