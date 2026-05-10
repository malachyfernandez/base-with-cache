import React, { Children, isValidElement, ReactNode } from 'react';
import { BlurView } from 'expo-blur';
import { Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useResolveClassNames } from 'uniwind';
import { X } from 'lucide-react-native';

type FlushSync = (callback: () => void) => void;

let flushSyncOnWeb: FlushSync = (callback) => {
  callback();
};

if (Platform.OS === 'web') {
  try {
    const reactDom = require('react-dom') as { flushSync?: FlushSync };
    if (reactDom.flushSync) {
      flushSyncOnWeb = reactDom.flushSync;
    }
  } catch {
    flushSyncOnWeb = (callback) => {
      callback();
    };
  }
}

export const LayoutContext = React.createContext<{
  buttonIcon?: ReactNode;
  layerMode: LayerMode;
  hoveredActionKey?: string | null;
  renderOnlyActionKey?: string | null;
  animationPhase?: 'expand' | 'contract' | null;
  animationDurationMs?: number;
  onActionHoverIn?: (action: LayoutAction) => void;
  onActionHoverOut?: () => void;
  onActionPress?: (action: LayoutAction) => void;
  onCloseScreen?: (path: string) => void;
  onScreenHoverIn?: (instanceId: string, templateId: string | number, path: string) => void;
  onScreenHoverOut?: () => void;
  onGapDragStart?: (path: string, index: number, clientX: number, clientY: number) => void;
  onGapDragMove?: (path: string, index: number, clientX: number, clientY: number) => void;
  onGapDragEnd?: (path: string, index: number, clientX: number, clientY: number) => void;
}>({ layerMode: 'window', animationDurationMs: 280 });

/* ───────── types ───────── */

type Direction = 'row' | 'column';
type Side = 'top' | 'right' | 'bottom' | 'left';
type ButtonOrientation = 'horizontal' | 'vertical';
type ButtonFamily = 'top' | 'bottom' | 'left' | 'right' | 'horizontal-split' | 'vertical-split';
type LayerMode = 'window' | 'controls' | 'wireframe' | 'hover-focus';
type BlurTint = React.ComponentProps<typeof BlurView>['tint'];

type LayoutAction =
  | {
      type: 'edge';
      key: string;
      path: string;
      side: Side;
    }
  | {
      type: 'split';
      key: string;
      path: string;
      index: number;
      direction: Direction;
    };

export type SplitNode = {
  type: 'split';
  direction: Direction;
  children: LayoutNode[];
  size?: string | number;
};

export type ScreenNode = {
  type: 'screen';
  id: string;
  screenTemplate: string | number;
  size?: string | number;
};

export type LayoutNode = SplitNode | ScreenNode;

export type OKLCHColor = {
  l: number;
  c: number;
  h: number;
};

export type LayoutTheme = {
  borderWidth: number;
  gapWidth: number;
  inactiveButtonThicknessRatio: number;
  buttonSpanRatio: number;
  borderRadius: number;
  canvasColor: OKLCHColor;
  panelColor: OKLCHColor;
  buttonColor: OKLCHColor;
  contrastStep: number;
  hoverBrightness: number;
  buttonClassName?: string;
  buttonStyle?: StyleProp<ViewStyle>;
  wireframeVisible: boolean;
  wireframeClassName?: string;
  wireframeStyle?: StyleProp<ViewStyle>;
  wireframeBorderColor: OKLCHColor;
  wireframeBorderOpacity: number;
  wireframeBorderWidth: number;
  wireframeBackgroundColor: OKLCHColor;
  wireframeBackgroundOpacity: number;
  wireframeBlurIntensity: number;
  wireframeBlurTint: BlurTint;
  wireframeRadiusOffset: number;
  wireframeFadeInHoldDuration: number;
  wireframeFadeOutHoldDuration: number;
  hoveredButtonVisible: boolean;
  hoveredButtonClassName?: string;
  hoveredButtonStyle?: StyleProp<ViewStyle>;
  hoveredButtonColor: OKLCHColor;
  hoveredButtonBorderColor: OKLCHColor;
  hoveredButtonBorderOpacity: number;
  hoveredButtonBorderWidth: number;
  hoveredButtonBackgroundColor: OKLCHColor;
  hoveredButtonBackgroundOpacity: number;
  hoveredButtonBlurIntensity: number;
  hoveredButtonBlurTint: BlurTint;
  hoveredButtonHoverBrightness: number;
  hoveredButtonRadiusOffset: number;
  screenScale?: number;
};

/* ───────── Layout system ───────── */

type LayoutProps = {
  config: LayoutNode;
  children: ReactNode;
  theme?: Partial<LayoutTheme>;
  buttonIcon?: ReactNode;
  hoverDelayMs?: number;
  nextScreenTemplate?: string | number;
  onConfigChange?: (config: LayoutNode) => void;
  onHoverInfoChange?: (info: LayoutHoverInfo | null) => void;
};

type ScreenSlotProps = {
  screenTemplate: string | number;
  children?: ReactNode;
};

export type LayoutHoverInfo =
  | { type: 'button'; buttonId: string; action: LayoutAction }
  | { type: 'component'; instanceId: string; templateId: string | number; slotId: string };

type Frame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ButtonCandidate = {
  id: string;
  orientation: ButtonOrientation;
  family: ButtonFamily;
  fixed: number;
  start: number;
  end: number;
  depth: number;
};

type VisibilityMap = Map<string, boolean>;

function configsEqual(a: LayoutNode, b: LayoutNode): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function linearToSrgb(value: number) {
  if (value <= 0.0031308) {
    return 12.92 * value;
  }

  return 1.055 * value ** (1 / 2.4) - 0.055;
}

function srgbToLinear(value: number) {
  if (value <= 0.04045) {
    return value / 12.92;
  }

  return ((value + 0.055) / 1.055) ** 2.4;
}

function srgbToOklch(red: number, green: number, blue: number): OKLCHColor {
  const r = srgbToLinear(red / 255);
  const g = srgbToLinear(green / 255);
  const b = srgbToLinear(blue / 255);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);

  const lightness = 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot;
  const a = 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot;
  const bAxis = 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot;

  return {
    l: clamp(lightness, 0, 1),
    c: Math.sqrt(a ** 2 + bAxis ** 2),
    h: ((Math.atan2(bAxis, a) * 180) / Math.PI + 360) % 360,
  };
}

function oklchToCssColor(color: OKLCHColor) {
  const hueRadians = (color.h * Math.PI) / 180;
  const a = color.c * Math.cos(hueRadians);
  const b = color.c * Math.sin(hueRadians);

  const lPrime = color.l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = color.l - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = color.l - 0.0894841775 * a - 1.291485548 * b;

  const l = lPrime ** 3;
  const m = mPrime ** 3;
  const s = sPrime ** 3;

  const red = linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const green = linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const blue = linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);

  return `rgb(${Math.round(clamp(red, 0, 1) * 255)}, ${Math.round(clamp(green, 0, 1) * 255)}, ${Math.round(clamp(blue, 0, 1) * 255)})`;
}

function oklchToCssColorWithAlpha(color: OKLCHColor, alpha: number) {
  if (alpha <= 0) {
    return 'transparent';
  }

  const hueRadians = (color.h * Math.PI) / 180;
  const a = color.c * Math.cos(hueRadians);
  const b = color.c * Math.sin(hueRadians);

  const lPrime = color.l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = color.l - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = color.l - 0.0894841775 * a - 1.291485548 * b;

  const l = lPrime ** 3;
  const m = mPrime ** 3;
  const s = sPrime ** 3;

  const red = linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const green = linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const blue = linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);

  return `rgba(${Math.round(clamp(red, 0, 1) * 255)}, ${Math.round(clamp(green, 0, 1) * 255)}, ${Math.round(clamp(blue, 0, 1) * 255)}, ${clamp(alpha, 0, 1)})`;
}

const DEFAULT_THEME: LayoutTheme = {
  borderWidth: 10,
  gapWidth: 10,
  inactiveButtonThicknessRatio: 0.5,
  buttonSpanRatio: 0.8,
  borderRadius: 20,
  canvasColor: { l: 0.18, c: 0, h: 0 },
  panelColor: srgbToOklch(30, 30, 30),
  contrastStep: 0.08,
  hoverBrightness: 0.1,
  buttonColor: srgbToOklch(222, 171, 238),
  wireframeVisible: true,
  wireframeBorderColor: srgbToOklch(255, 255, 255),
  wireframeBorderOpacity: 0.85,
  wireframeBorderWidth: 1,
  wireframeBackgroundColor: srgbToOklch(32, 32, 36),
  wireframeBackgroundOpacity: 0.14,
  wireframeBlurIntensity: 8,
  wireframeBlurTint: 'dark',
  wireframeRadiusOffset: 0,
  wireframeFadeInHoldDuration: 0,
  wireframeFadeOutHoldDuration: 0,
  hoveredButtonVisible: true,
  hoveredButtonColor: srgbToOklch(255, 255, 255),
  hoveredButtonBorderColor: srgbToOklch(255, 255, 255),
  hoveredButtonBorderOpacity: 1,
  hoveredButtonBorderWidth: 1,
  hoveredButtonBackgroundColor: srgbToOklch(255, 255, 255),
  hoveredButtonBackgroundOpacity: 0,
  hoveredButtonBlurIntensity: 24,
  hoveredButtonBlurTint: 'light',
  hoveredButtonHoverBrightness: 0.04,
  hoveredButtonRadiusOffset: 0,
  screenScale: 1,
};

const SIZE_SPRING = {
  damping: 22,
  stiffness: 260,
  mass: 0.9,
};

const WEB_STAGE_DELAY_MS = 24;

const debugLayout = (...args: unknown[]) => {
  // Debug logging disabled
};

const scheduleOnWeb = (callback: () => void, delayMs: number) => {
  if (Platform.OS === 'web') {
    return window.setTimeout(callback, delayMs);
  }

  return requestAnimationFrame(callback);
};

const clearScheduledTask = (taskId: number) => {
  if (Platform.OS === 'web') {
    window.clearTimeout(taskId);
    return;
  }

  cancelAnimationFrame(taskId);
};

const commitWebLayoutStage = (callback: () => void) => {
  if (Platform.OS === 'web') {
    flushSyncOnWeb(callback);
    return;
  }

  callback();
};

const OSCILLATION_WINDOW_MS = 500;
const OSCILLATION_THRESHOLD = 3;

function checkOscillation(recent: { configStr: string; time: number }[], configStr: string): { oscillating: boolean; updated: { configStr: string; time: number }[] } {
  const now = Date.now();
  const filtered = recent.filter((e) => now - e.time < OSCILLATION_WINDOW_MS);
  filtered.push({ configStr, time: now });
  const counts = new Map<string, number>();
  for (const e of filtered) {
    counts.set(e.configStr, (counts.get(e.configStr) ?? 0) + 1);
  }
  const maxCount = Math.max(0, ...counts.values());
  return { oscillating: maxCount >= OSCILLATION_THRESHOLD, updated: filtered };
}

const layoutLog = (tag: string, ...args: unknown[]) => {
  console.log(`[Layout:${tag}]`, ...args);
};

const extractScreenSizes = (node: LayoutNode): Record<string, string> => {
  const result: Record<string, string> = {};
  const walk = (n: LayoutNode) => {
    if (n.type === 'screen') {
      result[n.id] = String(n.size ?? 'auto');
    } else {
      n.children.forEach(walk);
    }
  };
  walk(node);
  return result;
};

const Layout = ({ config, children, theme, buttonIcon, hoverDelayMs = 300, nextScreenTemplate, onConfigChange, onHoverInfoChange }: LayoutProps) => {
  const screenMap = new Map<string | number, ReactNode>();

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === LayoutScreen) {
      const props = child.props as ScreenSlotProps;
      screenMap.set(props.screenTemplate, props.children);
    }
  });

  const resolvedTheme = React.useMemo(() => ({ ...DEFAULT_THEME, ...theme }), [theme]);
  const [committedConfig, setCommittedConfig] = React.useState(config);
  const [windowConfig, setWindowConfig] = React.useState(config);
  const [animateWindowSizes, setAnimateWindowSizes] = React.useState(false);
  const [controlsConfig, setControlsConfig] = React.useState(config);
  const [animateControlSizes, setAnimateControlSizes] = React.useState(false);
  const [wireframeConfig, setWireframeConfig] = React.useState<LayoutNode | null>(null);
  const [animateWireframeSizes, setAnimateWireframeSizes] = React.useState(false);
  const [hoveredActionKey, setHoveredActionKey] = React.useState<string | null>(null);
  const [animationPhase, setAnimationPhase] = React.useState<'expand' | 'contract' | null>(null);
  const [animationDurationMs, setAnimationDurationMs] = React.useState(280);
  const getMaxInstanceNumber = React.useCallback((node: LayoutNode): number => {
    let max = 0;
    walkLayout(node, (n) => {
      if (n.type === 'screen') {
        const match = n.id.match(/^inst-(\d+)$/);
        if (match) {
          max = Math.max(max, parseInt(match[1], 10));
        }
      }
    });
    return max;
  }, []);
  const nextInstanceIdRef = React.useRef(getMaxInstanceNumber(config) + 1);
  const generateInstanceId = React.useCallback(() => {
    const id = `inst-${nextInstanceIdRef.current}`;
    nextInstanceIdRef.current += 1;
    return id;
  }, []);
  const animationFrameRefs = React.useRef<number[]>([]);
  const suppressHoverOutUntilRef = React.useRef(0);
  const hoveredActionKeyRef = React.useRef<string | null>(null);
  const hoveredIntroConfigRef = React.useRef<LayoutNode | null>(null);
  const hoveredDurationRef = React.useRef(280);
  const skipNextHoverOutRef = React.useRef(false);
  const containerSizeRef = React.useRef({ width: 1000, height: 600 });
  const committedConfigRef = React.useRef(config);
  const lastEmittedConfigRef = React.useRef<LayoutNode>(config);
  const liveDragConfigRef = React.useRef<LayoutNode | null>(null);
  const recentEmissionsRef = React.useRef<{ configStr: string; time: number }[]>([]);
  committedConfigRef.current = committedConfig;
  const resizeStateRef = React.useRef<{
    path: string;
    index: number;
    direction: Direction;
    parentRect: PixelRect;
    initialShares: number[];
    startX: number;
    startY: number;
  } | null>(null);
  const wireframeOpacity = useSharedValue(0);
  const wireframeAnimatedStyle = useAnimatedStyle(() => ({ opacity: wireframeOpacity.value }));
  const [containerSize, setContainerSize] = React.useState({ width: 1000, height: 600 });

  const resolveAnimationDuration = React.useCallback((fromConfig: LayoutNode, toConfig: LayoutNode) => {
    const { width, height } = containerSizeRef.current;
    const fromRects = computeScreenRects(fromConfig, { x: 0, y: 0, width, height });
    const toRects = computeScreenRects(toConfig, { x: 0, y: 0, width, height });
    const distance = computeMaxScreenDistance(fromRects, toRects);
    return getScaledAnimationDuration(distance);
  }, []);

  React.useEffect(() => {
    const equal = configsEqual(config, committedConfigRef.current);
    layoutLog('effect', 'configPropChanged', { equal, hasResize: !!resizeStateRef.current });
    if (equal) {
      return;
    }
    if (resizeStateRef.current) {
      layoutLog('effect', 'configPropChanged skipped - resize active');
      return;
    }

    animationFrameRefs.current.forEach((frameId) => clearScheduledTask(frameId));
    animationFrameRefs.current = [];

    layoutLog('effect', 'resetting internal state to config prop', { screenSizes: extractScreenSizes(config) });
    setCommittedConfig(config);
    setWindowConfig(config);
    setAnimateWindowSizes(false);
    setControlsConfig(config);
    setAnimateControlSizes(false);
    setWireframeConfig(null);
    setAnimateWireframeSizes(false);
    setHoveredActionKey(null);
    nextInstanceIdRef.current = getMaxInstanceNumber(config) + 1;
    suppressHoverOutUntilRef.current = 0;
    hoveredActionKeyRef.current = null;
    hoveredIntroConfigRef.current = null;
    lastEmittedConfigRef.current = config;
    liveDragConfigRef.current = null;
  }, [config]);

  React.useEffect(() => {
    const equalToProp = configsEqual(committedConfig, config);
    const equalToLast = configsEqual(committedConfig, lastEmittedConfigRef.current);
    layoutLog('effect', 'committedConfigChanged', { equalToProp, equalToLast, hasResize: !!resizeStateRef.current });
    if (equalToProp) {
      lastEmittedConfigRef.current = config;
      return;
    }
    if (resizeStateRef.current) {
      return;
    }
    if (!equalToLast) {
      const configStr = JSON.stringify(committedConfig);
      const recent = recentEmissionsRef.current;
      const check = checkOscillation(recent, configStr);
      if (check.oscillating) {
        layoutLog('effect', 'committedConfigChanged OSCILLATION DETECTED - suppressing emit');
        console.error('[Layout:OSCILLATION] Rapid config oscillation detected in emission effect. Suppressing.');
        return;
      }
      recentEmissionsRef.current = check.updated;
      lastEmittedConfigRef.current = committedConfig;
      layoutLog('effect', 'emitting committedConfig', { screenSizes: extractScreenSizes(committedConfig) });
      onConfigChange?.(committedConfig);
    }
  }, [committedConfig, config, onConfigChange]);

  React.useEffect(() => {
    return () => {
      animationFrameRefs.current.forEach((frameId) => clearScheduledTask(frameId));
      animationFrameRefs.current = [];
    };
  }, []);

  React.useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    debugLayout('state', {
      animateWindowSizes,
      animateControlSizes,
      animateWireframeSizes,
      window: summarizeLayout(windowConfig),
      controls: summarizeLayout(controlsConfig),
      wireframe: wireframeConfig ? summarizeLayout(wireframeConfig) : null,
      committed: summarizeLayout(committedConfig),
    });
  }, [animateControlSizes, animateWireframeSizes, animateWindowSizes, committedConfig, controlsConfig, wireframeConfig, windowConfig]);

  const activeVisibilityMap = React.useMemo(() => buildVisibilityMap(windowConfig), [windowConfig]);
  const controlVisibilityMap = React.useMemo(() => buildVisibilityMap(controlsConfig), [controlsConfig]);
  const wireframeVisibilityMap = React.useMemo(
    () => (wireframeConfig ? buildVisibilityMap(wireframeConfig) : null),
    [wireframeConfig],
  );
  const [overlayTransitionsEnabled, setOverlayTransitionsEnabled] = React.useState(true);
  const screenRects = React.useMemo(
    () => computeInnerScreenRects(committedConfig, { x: 0, y: 0, width: containerSize.width, height: containerSize.height }, resolvedTheme, activeVisibilityMap),
    [committedConfig, activeVisibilityMap, containerSize.height, containerSize.width, resolvedTheme],
  );

  const animateControlsToConfig = React.useCallback(
    (nextConfig: LayoutNode, durationMs: number) => {
      commitWebLayoutStage(() => {
        setAnimateControlSizes(false);
        setControlsConfig(committedConfig);
      });

      const stageOne = scheduleOnWeb(() => {
        commitWebLayoutStage(() => {
          setAnimateControlSizes(true);
        });

        const stageTwo = scheduleOnWeb(() => {
          commitWebLayoutStage(() => {
            setControlsConfig(nextConfig);
          });
          animationFrameRefs.current = animationFrameRefs.current.filter((frameId) => frameId !== stageTwo);
        }, WEB_STAGE_DELAY_MS);

        animationFrameRefs.current.push(stageTwo);
        animationFrameRefs.current = animationFrameRefs.current.filter((frameId) => frameId !== stageOne);
      }, WEB_STAGE_DELAY_MS);

      const cleanup = scheduleOnWeb(() => {
        commitWebLayoutStage(() => {
          setAnimateControlSizes(false);
        });
        animationFrameRefs.current = animationFrameRefs.current.filter((frameId) => frameId !== cleanup);
      }, durationMs + WEB_STAGE_DELAY_MS * 2);

      animationFrameRefs.current.push(stageOne, cleanup);
    },
    [committedConfig],
  );

  const handleActionHoverIn = React.useCallback(
    (action: LayoutAction) => {
      if (resizeStateRef.current) {
        return;
      }
      hoveredActionKeyRef.current = action.key;

      const plan = buildLayoutActionPlan(committedConfig, action, nextScreenTemplate ?? 'blank', generateInstanceId());
      const durationMs = resolveAnimationDuration(committedConfig, plan.finalConfig);
      hoveredDurationRef.current = durationMs;
      setAnimationDurationMs(durationMs);

      animationFrameRefs.current.forEach((frameId) => clearScheduledTask(frameId));
      animationFrameRefs.current = [];

      setAnimationPhase('expand');
      setHoveredActionKey(action.key);
      hoveredActionKeyRef.current = action.key;
      onHoverInfoChange?.({ type: 'button', buttonId: action.key, action });

      const delayedFrame = scheduleOnWeb(() => {
        hoveredIntroConfigRef.current = plan.introConfig;
        commitWebLayoutStage(() => {
          setAnimateWireframeSizes(false);
          setWireframeConfig(plan.introConfig);
          wireframeOpacity.value = withTiming(1, { duration: 160 });
        });

        const frameOne = scheduleOnWeb(() => {
          commitWebLayoutStage(() => {
            setAnimateWireframeSizes(true);
          });
          const frameTwo = scheduleOnWeb(() => {
            commitWebLayoutStage(() => {
              setWireframeConfig(plan.finalConfig);
            });
            animationFrameRefs.current = animationFrameRefs.current.filter((frameId) => frameId !== frameTwo);
          }, WEB_STAGE_DELAY_MS);

          animationFrameRefs.current.push(frameTwo);
          animationFrameRefs.current = animationFrameRefs.current.filter((frameId) => frameId !== frameOne);
        }, WEB_STAGE_DELAY_MS + resolvedTheme.wireframeFadeInHoldDuration);

        animationFrameRefs.current.push(frameOne);
      }, hoverDelayMs);

      animationFrameRefs.current.push(delayedFrame);
    },
    [committedConfig, hoverDelayMs, nextScreenTemplate, onHoverInfoChange, resolveAnimationDuration, resolvedTheme.wireframeFadeInHoldDuration],
  );

  const handleActionHoverOut = React.useCallback(() => {
    if (resizeStateRef.current) {
      return;
    }
    if (Date.now() < suppressHoverOutUntilRef.current) {
      return;
    }

    if (skipNextHoverOutRef.current) {
      skipNextHoverOutRef.current = false;
      return;
    }

    animationFrameRefs.current.forEach((frameId) => clearScheduledTask(frameId));
    animationFrameRefs.current = [];
    setAnimationPhase('contract');
    setHoveredActionKey(null);
    hoveredActionKeyRef.current = null;
    onHoverInfoChange?.(null);

    hoveredIntroConfigRef.current = null;

    // Fade out wireframe from its current final preview position — no layout animation
    wireframeOpacity.value = withTiming(0, { duration: 120 });

    const clearAnimationTask = scheduleOnWeb(() => {
      commitWebLayoutStage(() => {
        setAnimateWireframeSizes(false);
        setWireframeConfig(null);
      });
      animationFrameRefs.current = animationFrameRefs.current.filter((frameId) => frameId !== clearAnimationTask);
    }, 150 + resolvedTheme.wireframeFadeOutHoldDuration);

    animationFrameRefs.current.push(clearAnimationTask);
  }, [onHoverInfoChange, resolvedTheme.wireframeFadeOutHoldDuration]);

  const handleScreenHoverIn = React.useCallback(
    (instanceId: string, templateId: string | number, slotId: string) => {
      onHoverInfoChange?.({ type: 'component', instanceId, templateId, slotId });
    },
    [onHoverInfoChange],
  );

  const handleScreenHoverOut = React.useCallback(() => {
    onHoverInfoChange?.(null);
  }, [onHoverInfoChange]);

  const handleActionPress = React.useCallback((action: LayoutAction) => {
    const screenTemplateToCreate = nextScreenTemplate ?? 'blank';
    const newInstanceId = generateInstanceId();
    const plan = buildLayoutActionPlan(committedConfig, action, screenTemplateToCreate, newInstanceId);

    suppressHoverOutUntilRef.current = Date.now() + 120;
    skipNextHoverOutRef.current = true;
    setHoveredActionKey(null);
    hoveredActionKeyRef.current = null;
    hoveredIntroConfigRef.current = null;
    animationFrameRefs.current.forEach((frameId) => clearScheduledTask(frameId));
    animationFrameRefs.current = [];

    setOverlayTransitionsEnabled(false);
    setAnimateWindowSizes(false);
    setAnimateControlSizes(false);
    setAnimateWireframeSizes(false);
    setCommittedConfig(plan.finalConfig);
    setWindowConfig(plan.finalConfig);
    setControlsConfig(plan.finalConfig);
    setWireframeConfig(null);
    wireframeOpacity.value = 0;

    scheduleOnWeb(() => {
      setOverlayTransitionsEnabled(true);
    }, 0);
  }, [committedConfig, generateInstanceId, nextScreenTemplate]);

  const handleCloseScreen = React.useCallback(
    (path: string) => {
      if (path === 'root' || !getNodeAtPath(committedConfig, path)) {
        return;
      }

      const closePlan = buildClosePlan(committedConfig, path);
      const removalConfig = removeNodeAtPath(committedConfig, path);
      const durationMs = resolveAnimationDuration(committedConfig, closePlan);
      setAnimationDurationMs(durationMs);

      animationFrameRefs.current.forEach((frameId) => clearScheduledTask(frameId));
      animationFrameRefs.current = [];

      setAnimationPhase('contract');
      setHoveredActionKey(null);
      hoveredActionKeyRef.current = null;
      hoveredIntroConfigRef.current = null;

      commitWebLayoutStage(() => {
        setAnimateWindowSizes(false);
        setAnimateControlSizes(false);
        setAnimateWireframeSizes(false);
        setWireframeConfig(null);
        wireframeOpacity.value = 0;
        // DON'T remove from committedConfig/controlsConfig yet — animate first, delete after
        setWindowConfig(committedConfig);
      });

      const frameOne = scheduleOnWeb(() => {
        commitWebLayoutStage(() => {
          setAnimateWindowSizes(true);
        });

        const frameTwo = scheduleOnWeb(() => {
          commitWebLayoutStage(() => {
            setWindowConfig(closePlan);
          });
          animationFrameRefs.current = animationFrameRefs.current.filter((frameId) => frameId !== frameTwo);
        }, WEB_STAGE_DELAY_MS);

        animationFrameRefs.current.push(frameTwo);
        animationFrameRefs.current = animationFrameRefs.current.filter((frameId) => frameId !== frameOne);
      }, WEB_STAGE_DELAY_MS);

      animationFrameRefs.current.push(frameOne);

      const cleanup = scheduleOnWeb(() => {
        commitWebLayoutStage(() => {
          setAnimateWindowSizes(false);
          setCommittedConfig(removalConfig);
          setControlsConfig(removalConfig);
          setWindowConfig(removalConfig);
        });
        animationFrameRefs.current = animationFrameRefs.current.filter((frameId) => frameId !== cleanup);
      }, durationMs + WEB_STAGE_DELAY_MS * 2);

      animationFrameRefs.current.push(cleanup);
    },
    [committedConfig, resolveAnimationDuration],
  );

  const handleGapDragStart = React.useCallback(
    (path: string, index: number, clientX: number, clientY: number) => {
      layoutLog('drag', 'dragStart', { path, index, clientX, clientY });
      liveDragConfigRef.current = null;
      const node = getNodeAtPath(committedConfigRef.current, path);
      if (!node || node.type !== 'split') {
        layoutLog('drag', 'dragStart abort - node not split', path);
        return;
      }
      const { width, height } = containerSizeRef.current;
      const nodeRects = computeNodeRects(committedConfigRef.current, { x: 0, y: 0, width, height });
      const parentRect = nodeRects.get(path);
      if (!parentRect) {
        layoutLog('drag', 'dragStart abort - no parentRect', path);
        return;
      }
      const shares = resolveShares(node.children);
      resizeStateRef.current = {
        path,
        index,
        direction: node.direction,
        parentRect,
        initialShares: [...shares],
        startX: clientX,
        startY: clientY,
      };
    },
    [],
  );

  const handleGapDragMove = React.useCallback(
    (_path: string, _index: number, clientX: number, clientY: number) => {
      if (!resizeStateRef.current) return;
      const { path, index, direction, parentRect, initialShares } = resizeStateRef.current;
      const delta = direction === 'row' ? clientX - resizeStateRef.current.startX : clientY - resizeStateRef.current.startY;
      const parentSize = direction === 'row' ? parentRect.width : parentRect.height;
      const deltaPercent = (delta / parentSize) * 100;

      const leftShare = initialShares[index];
      const rightShare = initialShares[index + 1];
      const totalShare = leftShare + rightShare;
      const minPercent = 5;

      let newLeft = leftShare + (deltaPercent / 100) * totalShare;
      let newRight = rightShare - (deltaPercent / 100) * totalShare;

      if (newLeft < minPercent / 100) {
        newLeft = minPercent / 100;
        newRight = totalShare - newLeft;
      } else if (newRight < minPercent / 100) {
        newRight = minPercent / 100;
        newLeft = totalShare - newRight;
      }

      const newShares = [...initialShares];
      newShares[index] = newLeft;
      newShares[index + 1] = newRight;

      const shareSum = newShares.reduce((sum, s) => sum + s, 0) || 1;
      const normalizedShares = newShares.map((s) => s / shareSum);

      const node = getNodeAtPath(committedConfigRef.current, path);
      if (!node || node.type !== 'split') return;

      const newChildren = node.children.map((child, i) => ({
        ...child,
        size: formatPercent(normalizedShares[i] * 100),
      }));

      const newConfig = updateNodeAtPath(committedConfigRef.current, path, (n) => ({
        ...n,
        children: newChildren,
      }));

      liveDragConfigRef.current = newConfig;
      setCommittedConfig(newConfig);
      setWindowConfig(newConfig);
      setControlsConfig(newConfig);
      setAnimateWindowSizes(false);
      setAnimateControlSizes(false);
    },
    [],
  );

  const handleGapDragEnd = React.useCallback(
    (_path: string, _index: number, clientX: number, clientY: number) => {
      layoutLog('drag', 'dragEnd', { _path, _index, clientX, clientY, resizeActive: !!resizeStateRef.current });
      if (!resizeStateRef.current) {
        layoutLog('drag', 'dragEnd abort - no resizeState');
        return;
      }
      const state = resizeStateRef.current;
      const totalDrag = Math.sqrt((state.startX - clientX) ** 2 + (state.startY - clientY) ** 2);
      resizeStateRef.current = null;

      if (totalDrag < 3) {
        layoutLog('drag', 'dragEnd interpreted as split click');
        const action: LayoutAction = {
          type: 'split',
          key: `${state.path}:split:${state.index}`,
          path: state.path,
          index: state.index,
          direction: state.direction,
        };
        handleActionPress(action);
      } else {
        const finalConfig = liveDragConfigRef.current ?? committedConfigRef.current;
        const configStr = JSON.stringify(finalConfig);
        if (configsEqual(finalConfig, lastEmittedConfigRef.current)) {
          layoutLog('drag', 'dragEnd skip emit - same as last emitted');
          liveDragConfigRef.current = null;
          return;
        }
        const recent = recentEmissionsRef.current;
        const check = checkOscillation(recent, configStr);
        if (check.oscillating) {
          layoutLog('drag', 'dragEnd OSCILLATION DETECTED - suppressing emit');
          console.error('[Layout:OSCILLATION] Rapid config oscillation detected. Suppressing further emissions.');
          liveDragConfigRef.current = null;
          return;
        }
        recentEmissionsRef.current = check.updated;
        lastEmittedConfigRef.current = finalConfig;
        layoutLog('drag', 'dragEnd emit config', { screenSizes: extractScreenSizes(finalConfig) });
        onConfigChange?.(finalConfig);
        liveDragConfigRef.current = null;
      }
    },
    [handleActionPress, onConfigChange],
  );

  return (
    <View
      style={{ flex: 1, backgroundColor: oklchToCssColor(resolvedTheme.canvasColor) }}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        containerSizeRef.current = { width, height };
        setContainerSize((current) => (
          current.width === width && current.height === height ? current : { width, height }
        ));
      }}
    >
      <LayoutContext.Provider value={{ buttonIcon, layerMode: 'window', animationPhase, animationDurationMs, onCloseScreen: handleCloseScreen, onScreenHoverIn: handleScreenHoverIn, onScreenHoverOut: handleScreenHoverOut }}>
        <LayoutRenderer
          node={windowConfig}
          screenMap={screenMap}
          theme={resolvedTheme}
          visibilityMap={activeVisibilityMap}
          depth={0}
          path="root"
          layerMode="window"
          animateSizes={animateWindowSizes}
          renderWindowContent={false}
        />
      </LayoutContext.Provider>
      {collectScreenSlots(committedConfig).map((slot) => {
        const rect = screenRects.get(slot.path);
        const renderContent = screenMap.get(slot.screen.screenTemplate);
        if (!rect) return null;
        return (
          <ScreenContentOverlay
            key={slot.screen.id}
            instanceId={slot.screen.id}
            templateId={slot.screen.screenTemplate}
            slotId={slot.path}
            rect={rect}
            theme={resolvedTheme}
            transitionEnabled={overlayTransitionsEnabled}
            onHoverIn={handleScreenHoverIn}
            onHoverOut={handleScreenHoverOut}
          >
            {renderContent ?? <FallbackScreen screenTemplate={slot.screen.screenTemplate} />}
          </ScreenContentOverlay>
        );
      })}
      <View style={StyleSheet.absoluteFillObject}>
        <LayoutContext.Provider
          value={{
            buttonIcon,
            layerMode: 'controls',
            hoveredActionKey,
            animationPhase,
            animationDurationMs,
            onActionHoverIn: handleActionHoverIn,
            onActionHoverOut: handleActionHoverOut,
            onActionPress: handleActionPress,
            onCloseScreen: handleCloseScreen,
            onScreenHoverIn: handleScreenHoverIn,
            onScreenHoverOut: handleScreenHoverOut,
            onGapDragStart: handleGapDragStart,
            onGapDragMove: handleGapDragMove,
            onGapDragEnd: handleGapDragEnd,
          }}
        >
          <LayoutRenderer
            node={controlsConfig}
            screenMap={screenMap}
            theme={resolvedTheme}
            visibilityMap={controlVisibilityMap}
            depth={0}
            path="root"
            layerMode="controls"
            animateSizes={animateControlSizes}
            renderWindowContent
          />
        </LayoutContext.Provider>
      </View>
      {resolvedTheme.wireframeVisible && wireframeConfig && wireframeVisibilityMap ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, wireframeAnimatedStyle]}
        >
          <LayoutContext.Provider
            value={{
              buttonIcon,
              layerMode: 'wireframe',
              hoveredActionKey,
              animationPhase,
              animationDurationMs,
              onCloseScreen: handleCloseScreen,
            }}
          >
            <LayoutRenderer
              node={wireframeConfig}
              screenMap={screenMap}
              theme={resolvedTheme}
              visibilityMap={wireframeVisibilityMap}
              depth={0}
              path="root"
              layerMode="wireframe"
              animateSizes={animateWireframeSizes}
              renderWindowContent
            />
          </LayoutContext.Provider>
        </Animated.View>
      ) : null}
      {resolvedTheme.hoveredButtonVisible && hoveredActionKey ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          <LayoutContext.Provider
            value={{
              buttonIcon,
              layerMode: 'hover-focus',
              hoveredActionKey,
              renderOnlyActionKey: hoveredActionKey,
              animationPhase,
              animationDurationMs,
              onCloseScreen: handleCloseScreen,
            }}
          >
            <LayoutRenderer
              node={committedConfig}
              screenMap={screenMap}
              theme={resolvedTheme}
              visibilityMap={activeVisibilityMap}
              depth={0}
              path="root"
              layerMode="hover-focus"
              animateSizes={false}
              renderWindowContent
            />
          </LayoutContext.Provider>
        </View>
      ) : null}
    </View>
  );
};

const LayoutScreen = (_props: ScreenSlotProps) => null;

interface LayoutComponent {
  (props: LayoutProps): ReactNode;
  Screen: (props: ScreenSlotProps) => null;
}

const LayoutWithScreen = Layout as LayoutComponent;
LayoutWithScreen.Screen = LayoutScreen;

export default LayoutWithScreen as LayoutComponent;

/* ───────── Recursive renderer ───────── */

type RendererProps = {
  node: LayoutNode;
  screenMap: Map<string | number, ReactNode>;
  theme: LayoutTheme;
  visibilityMap: VisibilityMap;
  depth: number;
  path: string;
  layerMode: LayerMode;
  animateSizes: boolean;
  renderWindowContent: boolean;
};

const LayoutRenderer = ({ node, screenMap, theme, visibilityMap, depth, path, layerMode, animateSizes, renderWindowContent }: RendererProps) => {
  const panelColor = shiftLightness(theme.panelColor, depth * theme.contrastStep);
  const buttonColor = shiftLightness(theme.buttonColor, depth * theme.contrastStep);
  const isWeb = Platform.OS === 'web';
  const { animationPhase, animationDurationMs, onCloseScreen, onScreenHoverIn, onScreenHoverOut } = React.useContext(LayoutContext);
  const targetFlexGrow = getFlexGrowValue(node.size);
  const flexGrow = useSharedValue(targetFlexGrow);

  React.useEffect(() => {
    cancelAnimation(flexGrow);

    if (animateSizes) {
      flexGrow.value = withSpring(targetFlexGrow, SIZE_SPRING);
      return;
    }

    flexGrow.value = targetFlexGrow;
  }, [animateSizes, flexGrow, targetFlexGrow]);

  const animatedFlexStyle = useAnimatedStyle(() => ({
    flexGrow: flexGrow.value,
  }));

  const webFlexStyle = React.useMemo<WebFlexTransitionStyle>(
    () => {
      if (!animateSizes) return { flexGrow: targetFlexGrow };
      const timingFunction = animationPhase === 'contract'
        ? 'cubic-bezier(0.64, 0, 0.78, 1)'
        : 'cubic-bezier(0.22, 1, 0.36, 1)';
      return {
        transitionProperty: 'flex-grow',
        transitionDuration: `${animationDurationMs ?? 280}ms`,
        transitionTimingFunction: timingFunction,
        willChange: 'flex-grow',
        flexGrow: targetFlexGrow,
      };
    },
    [animateSizes, targetFlexGrow, animationPhase, animationDurationMs],
  );

  const flexStyle = React.useMemo(
    () => [BASE_FLEX_STYLE, isWeb ? webFlexStyle : animatedFlexStyle],
    [animatedFlexStyle, isWeb, webFlexStyle],
  );

  if (node.type === 'screen') {
    const content = screenMap.get(node.screenTemplate);
    const contentRadius = Math.max(theme.borderRadius - theme.borderWidth + theme.wireframeRadiusOffset, 0);

    return (
      <FlexContainer style={flexStyle}>
        <ContainerChrome
          path={path}
          theme={theme}
          visibilityMap={visibilityMap}
          panelColor={panelColor}
          buttonColor={buttonColor}
          layerMode={layerMode}
        >
          {layerMode === 'window' ? (
            <View
              style={{
                flex: 1,
                borderRadius: Math.max(theme.borderRadius - theme.borderWidth, 0),
                overflow: 'hidden',
              }}
            >
              {renderWindowContent && theme.screenScale !== undefined && theme.screenScale !== 1 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <View style={{ width: '100%', height: '100%', transform: [{ scale: theme.screenScale }] }}>
                    {content ?? <FallbackScreen screenTemplate={node.screenTemplate} />}
                  </View>
                </View>
              ) : renderWindowContent ? (
                content ?? <FallbackScreen screenTemplate={node.screenTemplate} />
              ) : null}
            </View>
          ) : layerMode === 'wireframe' ? (
            <View
              className={theme.wireframeClassName}
              style={[
                {
                  flex: 1,
                  borderRadius: contentRadius,
                  overflow: 'hidden',
                  backgroundColor: oklchToCssColorWithAlpha(theme.wireframeBackgroundColor, theme.wireframeBackgroundOpacity),
                  borderWidth: theme.wireframeBorderWidth,
                  borderColor: oklchToCssColorWithAlpha(theme.wireframeBorderColor, theme.wireframeBorderOpacity),
                },
                theme.wireframeStyle,
              ]}
            >
              <BlurFill intensity={theme.wireframeBlurIntensity} tint={theme.wireframeBlurTint} borderRadius={contentRadius} />
            </View>
          ) : layerMode === 'controls' ? (
            <View
              style={{ flex: 1 }}
              onPointerEnter={() => onScreenHoverIn?.(node.id, node.screenTemplate, path)}
              onPointerLeave={onScreenHoverOut}
            >
              {onCloseScreen && (
                <Pressable
                  onPress={() => onCloseScreen(path)}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10,
                  }}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <X size={16} color="#fff" />
                </Pressable>
              )}
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </ContainerChrome>
      </FlexContainer>
    );
  }

  const isRow = node.direction === 'row';

  return (
    <FlexContainer style={flexStyle}>
      <ContainerChrome
        path={path}
        theme={theme}
        visibilityMap={visibilityMap}
        panelColor={panelColor}
        buttonColor={buttonColor}
        layerMode={layerMode}
      >
        <View style={{ flex: 1, flexDirection: isRow ? 'row' : 'column' }}>
          {node.children.map((child, index) => (
            <React.Fragment key={`${path}.${index}`}>
              <LayoutRenderer
                node={child}
                screenMap={screenMap}
                theme={theme}
                visibilityMap={visibilityMap}
                depth={depth + 1}
                path={`${path}.${index}`}
                layerMode={layerMode}
                animateSizes={animateSizes}
                renderWindowContent={renderWindowContent}
              />
              {index < node.children.length - 1 ? (
                <SplitGap
                  path={path}
                  index={index}
                  direction={node.direction}
                  active={visibilityMap.get(`${path}:split:${index}`) ?? true}
                  theme={theme}
                  buttonColor={buttonColor}
                  layerMode={layerMode}
                />
              ) : null}
            </React.Fragment>
          ))}
        </View>
      </ContainerChrome>
    </FlexContainer>
  );
};

const BASE_FLEX_STYLE = {
  flexBasis: 0,
  flexShrink: 1,
} as const;

type WebFlexTransitionStyle = ViewStyle & {
  transitionProperty?: string;
  transitionDuration?: string;
  transitionTimingFunction?: string;
  willChange?: string;
};

const FlexContainer: React.ComponentType<any> = Platform.OS === 'web' ? View : Animated.View;

const BlurFill = ({ intensity, tint, borderRadius }: { intensity: number; tint: BlurTint; borderRadius: number }) => {
  if (intensity <= 0) {
    return null;
  }

  return (
    <BlurView
      intensity={intensity}
      tint={tint}
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { borderRadius }]}
    />
  );
};

const getButtonRadiusOffset = (theme: LayoutTheme, layerMode: LayerMode) => {
  if (layerMode === 'hover-focus') {
    return theme.hoveredButtonRadiusOffset;
  }

  return 0;
};

const getButtonVisualConfig = (theme: LayoutTheme, layerMode: LayerMode, color: OKLCHColor, hovered: boolean) => {
  if (layerMode === 'hover-focus') {
    const displayColor = hovered
      ? { ...theme.hoveredButtonColor, l: Math.min(1, theme.hoveredButtonColor.l + theme.hoveredButtonHoverBrightness) }
      : theme.hoveredButtonColor;
    return {
      backgroundColor: oklchToCssColorWithAlpha(theme.hoveredButtonBackgroundColor, theme.hoveredButtonBackgroundOpacity),
      borderColor: oklchToCssColorWithAlpha(theme.hoveredButtonBorderColor, theme.hoveredButtonBorderOpacity),
      borderWidth: theme.hoveredButtonBorderWidth,
      blurIntensity: theme.hoveredButtonBlurIntensity,
      blurTint: theme.hoveredButtonBlurTint,
      className: theme.hoveredButtonClassName,
      style: theme.hoveredButtonStyle,
      fillColor: oklchToCssColor(displayColor),
    };
  }

  return {
    backgroundColor: oklchToCssColor(color),
    borderColor: 'transparent',
    borderWidth: 0,
    blurIntensity: 0,
    blurTint: 'default' as BlurTint,
    className: theme.buttonClassName,
    style: theme.buttonStyle,
    fillColor: oklchToCssColor(color),
  };
};

const getFlexGrowValue = (size?: string | number) => {
  if (size === undefined) {
    return 1;
  }

  return Math.max(parseSizeValue(size), 0);
};

const VELOCITY_PX_PER_MS = 2.0;
const MIN_ANIMATION_DURATION_MS = 120;
const MAX_ANIMATION_DURATION_MS = 600;

type PixelRect = { x: number; y: number; width: number; height: number };

function computeScreenRects(node: LayoutNode, rect: PixelRect): Map<string, PixelRect> {
  const result = new Map<string, PixelRect>();
  if (node.type === 'screen') {
    result.set(node.id, rect);
    return result;
  }
  const isRow = node.direction === 'row';
  const totalFlex = node.children.reduce((sum, child) => sum + getFlexGrowValue(child.size), 0);
  let offset = 0;
  for (const child of node.children) {
    const flex = getFlexGrowValue(child.size);
    const ratio = totalFlex > 0 ? flex / totalFlex : 1 / node.children.length;
    let childRect: PixelRect;
    if (isRow) {
      const w = rect.width * ratio;
      childRect = { x: rect.x + offset, y: rect.y, width: w, height: rect.height };
      offset += w;
    } else {
      const h = rect.height * ratio;
      childRect = { x: rect.x, y: rect.y + offset, width: rect.width, height: h };
      offset += h;
    }
    const childMap = computeScreenRects(child, childRect);
    childMap.forEach((r, id) => result.set(id, r));
  }
  return result;
}

const ScreenContentOverlay = ({
  instanceId,
  templateId,
  slotId,
  rect,
  theme,
  transitionEnabled,
  onHoverIn,
  onHoverOut,
  children,
}: {
  instanceId: string;
  templateId: string | number;
  slotId: string;
  rect: PixelRect;
  theme: LayoutTheme;
  transitionEnabled: boolean;
  onHoverIn: (instanceId: string, templateId: string | number, slotId: string) => void;
  onHoverOut: () => void;
  children: ReactNode;
}) => {
  React.useEffect(() => {
    console.log(`[Overlay:${instanceId}] x=${rect.x.toFixed(1)} y=${rect.y.toFixed(1)} w=${rect.width.toFixed(1)} h=${rect.height.toFixed(1)}`);
  }, [instanceId, rect.x, rect.y, rect.width, rect.height]);

  const contentRadius = Math.max(theme.borderRadius - theme.borderWidth, 0);
  const webTransitionStyle: StyleProp<ViewStyle> = Platform.OS === 'web'
    ? {
        transitionProperty: 'transform, width, height',
        transitionDuration: transitionEnabled ? '280ms' : '0ms',
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
        willChange: 'transform, width, height',
      } as ViewStyle
    : undefined;

  return (
    <View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          width: rect.width,
          height: rect.height,
          transform: [{ translateX: rect.x }, { translateY: rect.y }],
          borderRadius: contentRadius,
          overflow: 'hidden',
        },
        webTransitionStyle,
      ]}
      onPointerEnter={() => onHoverIn(instanceId, templateId, slotId)}
      onPointerLeave={onHoverOut}
    >
      {theme.screenScale !== undefined && theme.screenScale !== 1 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '100%', height: '100%', transform: [{ scale: theme.screenScale }] }}>
            {children}
          </View>
        </View>
      ) : (
        children
      )}
    </View>
  );
};

type ScreenSlot = {
  path: string;
  screen: ScreenNode;
};

function collectScreenSlots(node: LayoutNode, path: string = 'root'): ScreenSlot[] {
  if (node.type === 'screen') {
    return [{ path, screen: node }];
  }

  return node.children.flatMap((child, index) => collectScreenSlots(child, `${path}.${index}`));
}

function computeInnerScreenRects(node: LayoutNode, rect: PixelRect, theme: LayoutTheme, visibilityMap: VisibilityMap, path: string = 'root'): Map<string, PixelRect> {
  const result = new Map<string, PixelRect>();
  const contentRect = getContentRect(rect, path, theme, visibilityMap);

  if (node.type === 'screen') {
    result.set(path, contentRect);
    return result;
  }

  const isRow = node.direction === 'row';
  const gapSizes = node.children.slice(0, -1).map((_, index) => {
    const active = visibilityMap.get(`${path}:split:${index}`) ?? true;
    return active ? theme.gapWidth : theme.gapWidth * theme.inactiveButtonThicknessRatio;
  });
  const totalGap = gapSizes.reduce((sum, gap) => sum + gap, 0);
  const available = Math.max((isRow ? contentRect.width : contentRect.height) - totalGap, 0);
  const totalFlex = node.children.reduce((sum, child) => sum + getFlexGrowValue(child.size), 0);
  let cursor = isRow ? contentRect.x : contentRect.y;

  node.children.forEach((child, index) => {
    const flex = getFlexGrowValue(child.size);
    const ratio = totalFlex > 0 ? flex / totalFlex : 1 / node.children.length;
    const span = available * ratio;
    const childRect = isRow
      ? { x: cursor, y: contentRect.y, width: span, height: contentRect.height }
      : { x: contentRect.x, y: cursor, width: contentRect.width, height: span };
    computeInnerScreenRects(child, childRect, theme, visibilityMap, `${path}.${index}`).forEach((value, key) => result.set(key, value));
    cursor += span + (gapSizes[index] ?? 0);
  });

  return result;
}

function getContentRect(rect: PixelRect, path: string, theme: LayoutTheme, visibilityMap: VisibilityMap): PixelRect {
  const full = theme.borderWidth;
  const half = full * theme.inactiveButtonThicknessRatio;
  const top = (visibilityMap.get(`${path}:edge:top`) ?? true) ? full : half;
  const right = (visibilityMap.get(`${path}:edge:right`) ?? true) ? full : half;
  const bottom = (visibilityMap.get(`${path}:edge:bottom`) ?? true) ? full : half;
  const left = (visibilityMap.get(`${path}:edge:left`) ?? true) ? full : half;

  return {
    x: rect.x + left,
    y: rect.y + top,
    width: Math.max(rect.width - left - right, 0),
    height: Math.max(rect.height - top - bottom, 0),
  };
}

function computeNodeRects(node: LayoutNode, rect: PixelRect, path: string = 'root'): Map<string, PixelRect> {
  const result = new Map<string, PixelRect>();
  result.set(path, rect);
  if (node.type === 'screen') {
    return result;
  }
  const isRow = node.direction === 'row';
  const totalFlex = node.children.reduce((sum, child) => sum + getFlexGrowValue(child.size), 0);
  let offset = 0;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    const flex = getFlexGrowValue(child.size);
    const ratio = totalFlex > 0 ? flex / totalFlex : 1 / node.children.length;
    let childRect: PixelRect;
    if (isRow) {
      const w = rect.width * ratio;
      childRect = { x: rect.x + offset, y: rect.y, width: w, height: rect.height };
      offset += w;
    } else {
      const h = rect.height * ratio;
      childRect = { x: rect.x, y: rect.y + offset, width: rect.width, height: h };
      offset += h;
    }
    const childMap = computeNodeRects(child, childRect, `${path}.${i}`);
    childMap.forEach((r, p) => result.set(p, r));
  }
  return result;
}

function computeMaxScreenDistance(rectsA: Map<string, PixelRect>, rectsB: Map<string, PixelRect>): number {
  let maxDist = 0;
  rectsA.forEach((rectA, id) => {
    const rectB = rectsB.get(id);
    if (!rectB) return;
    const cxA = rectA.x + rectA.width / 2;
    const cyA = rectA.y + rectA.height / 2;
    const cxB = rectB.x + rectB.width / 2;
    const cyB = rectB.y + rectB.height / 2;
    const dist = Math.sqrt((cxB - cxA) ** 2 + (cyB - cyA) ** 2);
    if (dist > maxDist) maxDist = dist;
  });
  return maxDist;
}

function getScaledAnimationDuration(distance: number): number {
  const raw = distance / VELOCITY_PX_PER_MS;
  return Math.max(MIN_ANIMATION_DURATION_MS, Math.min(MAX_ANIMATION_DURATION_MS, Math.round(raw)));
}

type ContainerChromeProps = {
  path: string;
  theme: LayoutTheme;
  visibilityMap: VisibilityMap;
  panelColor: OKLCHColor;
  buttonColor: OKLCHColor;
  layerMode: LayerMode;
  children: ReactNode;
};

const ContainerChrome = ({ path, theme, visibilityMap, panelColor, buttonColor, layerMode, children }: ContainerChromeProps) => {
  const full = theme.borderWidth;
  const half = full * theme.inactiveButtonThicknessRatio;
  const showButtons = layerMode === 'controls' || layerMode === 'hover-focus';

  const topPad = (visibilityMap.get(`${path}:edge:top`) ?? true) ? full : half;
  const rightPad = (visibilityMap.get(`${path}:edge:right`) ?? true) ? full : half;
  const bottomPad = (visibilityMap.get(`${path}:edge:bottom`) ?? true) ? full : half;
  const leftPad = (visibilityMap.get(`${path}:edge:left`) ?? true) ? full : half;

  return (
    <View
      style={{
        flex: 1,
        position: 'relative',
        borderRadius: theme.borderRadius,
        overflow: 'hidden',
      }}
      pointerEvents={layerMode === 'controls' ? 'auto' : layerMode === 'window' ? 'auto' : 'none'}
    >
      {layerMode === 'window' ? (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: oklchToCssColor(panelColor) }]} />
      ) : null}

      <View
        style={{
          flex: 1,
          paddingTop: topPad,
          paddingRight: rightPad,
          paddingBottom: bottomPad,
          paddingLeft: leftPad,
        }}
      >
        {children}
      </View>

      {showButtons ? (
        <>
          <EdgeButton
            path={path}
            side="top"
            active={visibilityMap.get(`${path}:edge:top`) ?? true}
            theme={theme}
            color={buttonColor}
          />
          <EdgeButton
            path={path}
            side="right"
            active={visibilityMap.get(`${path}:edge:right`) ?? true}
            theme={theme}
            color={buttonColor}
          />
          <EdgeButton
            path={path}
            side="bottom"
            active={visibilityMap.get(`${path}:edge:bottom`) ?? true}
            theme={theme}
            color={buttonColor}
          />
          <EdgeButton
            path={path}
            side="left"
            active={visibilityMap.get(`${path}:edge:left`) ?? true}
            theme={theme}
            color={buttonColor}
          />
        </>
      ) : null}
    </View>
  );
};

const EdgeButton = ({
  path,
  side,
  active,
  theme,
  color,
}: {
  path: string;
  side: Side;
  active: boolean;
  theme: LayoutTheme;
  color: OKLCHColor;
}) => {
  const {
    buttonIcon,
    hoveredActionKey: globalHoveredKey,
    layerMode,
    onActionHoverIn,
    onActionHoverOut,
    onActionPress,
    renderOnlyActionKey,
  } = React.useContext(LayoutContext);

  const thickness = theme.borderWidth;
  const insetPercent = ((1 - theme.buttonSpanRatio) / 2) * 100;
  const spanPercent = theme.buttonSpanRatio * 100;
  const action: LayoutAction = { type: 'edge', key: `${path}:edge:${side}`, path, side };
  const isInteractive = layerMode === 'controls';
  const isHoveredVisual = layerMode === 'controls' ? false : globalHoveredKey === action.key;
  const visualConfig = getButtonVisualConfig(theme, layerMode, color, isHoveredVisual);
  const classNameStyles = useResolveClassNames(visualConfig.className ?? '');
  const radius = Math.max(thickness / 2 + getButtonRadiusOffset(theme, layerMode), 0);

  if (!active) {
    return null;
  }

  if (renderOnlyActionKey && renderOnlyActionKey !== action.key) {
    return null;
  }

  const baseStyle = {
    position: 'absolute' as const,
    [side]: 0,
    borderRadius: radius,
    backgroundColor: visualConfig.backgroundColor,
    borderColor: visualConfig.borderColor,
    borderWidth: visualConfig.borderWidth,
    overflow: 'hidden' as const,
  };

  const inner = (
    <Pressable
      disabled={!isInteractive}
      onHoverIn={() => {
        if (!isInteractive) {
          return;
        }
        onActionHoverIn?.(action);
      }}
      onHoverOut={() => {
        if (!isInteractive) {
          return;
        }
        onActionHoverOut?.();
      }}
      onPressIn={() => {
        if (!isInteractive) {
          return;
        }
        onActionHoverIn?.(action);
      }}
      onPressOut={() => {
        if (!isInteractive) {
          return;
        }
      }}
      onPress={() => {
        if (!isInteractive) {
          return;
        }
        onActionPress?.(action);
      }}
      style={[
        baseStyle,
        side === 'top' || side === 'bottom'
          ? { left: `${insetPercent}%`, width: `${spanPercent}%`, height: thickness }
          : { top: `${insetPercent}%`, width: thickness, height: `${spanPercent}%` },
        visualConfig.style,
        classNameStyles,
      ]}
    >
      <BlurFill intensity={visualConfig.blurIntensity} tint={visualConfig.blurTint} borderRadius={radius} />
      {buttonIcon ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {buttonIcon}
        </View>
      ) : null}
    </Pressable>
  );

  return inner;
};

const SplitGap = ({
  path,
  index,
  direction,
  active,
  theme,
  buttonColor,
  layerMode,
}: {
  path: string;
  index: number;
  direction: Direction;
  active: boolean;
  theme: LayoutTheme;
  buttonColor: OKLCHColor;
  layerMode: LayerMode;
}) => {
  const full = theme.gapWidth;
  const half = full * theme.inactiveButtonThicknessRatio;
  const {
    buttonIcon,
    hoveredActionKey: globalHoveredKey,
    onActionHoverIn,
    onActionHoverOut,
    onActionPress,
    onGapDragStart,
    onGapDragMove,
    onGapDragEnd,
    renderOnlyActionKey,
  } = React.useContext(LayoutContext);

  const isDraggingRef = React.useRef(false);
  const handledPressRef = React.useRef(false);
  const suppressHoverRef = React.useRef(false);

  const spacerStyle = direction === 'row' ? { width: active ? full : half } : { height: active ? full : half };
  const action: LayoutAction = { type: 'split', key: `${path}:split:${index}`, path, index, direction };
  const isInteractive = layerMode === 'controls';
  const isHoveredVisual = layerMode === 'controls' ? false : globalHoveredKey === action.key;
  const visualConfig = getButtonVisualConfig(theme, layerMode, buttonColor, isHoveredVisual);
  const classNameStyles = useResolveClassNames(visualConfig.className ?? '');
  const radius = Math.max(full / 2 + getButtonRadiusOffset(theme, layerMode), 0);

  const baseButtonStyle = {
    borderRadius: radius,
    backgroundColor: visualConfig.backgroundColor,
    borderColor: visualConfig.borderColor,
    borderWidth: visualConfig.borderWidth,
    overflow: 'hidden' as const,
  };

  const iconWrapper = buttonIcon ? (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
      {buttonIcon}
    </View>
  ) : null;

  const attachDragListeners = React.useCallback(
    (startEvent: any) => {
      if (Platform.OS !== 'web' || !isInteractive) return;
      const nativeEvent = startEvent.nativeEvent as PointerEvent;
      const startX = nativeEvent.clientX;
      const startY = nativeEvent.clientY;
      isDraggingRef.current = false;
      handledPressRef.current = false;
      suppressHoverRef.current = true;

      const handlePointerMove = (e: PointerEvent) => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (!isDraggingRef.current && dist > 3) {
          isDraggingRef.current = true;
          onGapDragStart?.(path, index, startX, startY);
        }
        if (isDraggingRef.current) {
          onGapDragMove?.(path, index, e.clientX, e.clientY);
        }
      };

      const handlePointerUp = (e: PointerEvent) => {
        suppressHoverRef.current = false;
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          onGapDragEnd?.(path, index, e.clientX, e.clientY);
          handledPressRef.current = true;
        } else {
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 3) {
            // Let onPress handle it; don't set handledPressRef
          } else {
            handledPressRef.current = true;
            onActionPress?.(action);
          }
        }
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [isInteractive, path, index, onGapDragStart, onGapDragMove, onGapDragEnd, onActionPress, action],
  );

  const pressableProps = {
    disabled: !isInteractive,
    onHoverIn: () => {
      if (!isInteractive) return;
      onActionHoverIn?.(action);
    },
    onHoverOut: () => {
      if (!isInteractive) return;
      onActionHoverOut?.();
    },
    onPressIn: () => {
      if (!isInteractive) return;
      if (suppressHoverRef.current) {
        return;
      }
      onActionHoverIn?.(action);
    },
    onPressOut: () => {
      if (!isInteractive) return;
    },
    onPress: () => {
      if (!isInteractive) return;
      suppressHoverRef.current = false;
      if (handledPressRef.current) {
        handledPressRef.current = false;
        return;
      }
      onActionPress?.(action);
    },
    ...(Platform.OS === 'web' && isInteractive
      ? ({
          onPointerDown: (e: any) => {
            attachDragListeners(e);
          },
        } as any)
      : {}),
  };

  if (layerMode === 'window' || layerMode === 'wireframe') {
    return <View style={spacerStyle} />;
  }

  if (!active) {
    return <View style={spacerStyle} />;
  }

  if (renderOnlyActionKey && renderOnlyActionKey !== action.key) {
    return <View style={spacerStyle} />;
  }

  if (direction === 'row') {
    return (
      <View style={{ width: full, alignItems: 'center', justifyContent: 'center' }}>
        <Pressable
          {...pressableProps}
          style={[
            baseButtonStyle,
            { width: full, height: `${theme.buttonSpanRatio * 100}%` },
            visualConfig.style,
            classNameStyles,
          ]}
        >
          <BlurFill intensity={visualConfig.blurIntensity} tint={visualConfig.blurTint} borderRadius={radius} />
          {iconWrapper ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              {iconWrapper}
            </View>
          ) : null}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ height: full, alignItems: 'center', justifyContent: 'center' }}>
      <Pressable
        {...pressableProps}
        style={[
          baseButtonStyle,
          { width: `${theme.buttonSpanRatio * 100}%`, height: full },
          visualConfig.style,
          classNameStyles,
        ]}
      >
        <BlurFill intensity={visualConfig.blurIntensity} tint={visualConfig.blurTint} borderRadius={radius} />
        {iconWrapper ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {iconWrapper}
          </View>
        ) : null}
      </Pressable>
    </View>
  );
};

const FallbackScreen = ({ screenTemplate }: { screenTemplate: string | number }) => {
  const hue = hueFromId(screenTemplate);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: `hsl(${hue}, 60%, 10%)`,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 12,
          backgroundColor: 'rgba(255,255,255,0.7)',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: `hsl(${hue}, 50%, 30%)`, fontWeight: '600' }}>Screen {String(screenTemplate)}</Text>
      </View>
    </View>
  );
};

function hueFromId(id: string | number | undefined) {
  if (id === undefined) return 0;
  const num = typeof id === 'number' ? id : parseInt(id, 10) || 0;
  return (num * 25) % 360;
}

const resolveShares = (children: LayoutNode[]) => {
  const explicitValues = children.map((child) => parseExplicitPercent(child.size));
  const totalExplicit = explicitValues.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const unspecifiedCount = explicitValues.filter((value) => value === null).length;
  const remaining = Math.max(100 - totalExplicit, 0);
  const fallbackShare = unspecifiedCount > 0 ? remaining / unspecifiedCount : 0;

  const rawShares = explicitValues.map((value) => {
    if (value !== null) {
      return value;
    }

    if (remaining > 0) {
      return fallbackShare;
    }

    return 100 / Math.max(children.length, 1);
  });

  const total = rawShares.reduce((sum, value) => sum + value, 0) || 1;
  return rawShares.map((value) => value / total);
};

const parseExplicitPercent = (size?: string | number) => {
  if (size === undefined) {
    return null;
  }

  if (typeof size === 'number') {
    return size;
  }

  const parsed = Number.parseFloat(size.replace('%', ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const parseSizeValue = (size: string | number) => {
  if (typeof size === 'number') {
    return size;
  }

  const parsed = Number.parseFloat(size.replace('%', ''));
  return Number.isFinite(parsed) ? parsed : 1;
};

const buildVisibilityMap = (config: LayoutNode) => {
  const candidates: ButtonCandidate[] = [];
  collectButtonCandidates(config, { x: 0, y: 0, width: 1, height: 1 }, 0, 'root', candidates);

  const groups = new Map<string, ButtonCandidate[]>();

  candidates.forEach((candidate) => {
    const key = `${candidate.orientation}:${candidate.fixed.toFixed(6)}:${candidate.start.toFixed(6)}:${candidate.end.toFixed(6)}`;
    const existing = groups.get(key);

    if (existing) {
      existing.push(candidate);
      return;
    }

    groups.set(key, [candidate]);
  });

  const visibilityMap: VisibilityMap = new Map();

  groups.forEach((group) => {
    group.forEach((candidate) => {
      const activeDepth = group
        .filter((other) => getConflictingFamilies(candidate.family).includes(other.family))
        .reduce((minDepth, other) => Math.min(minDepth, other.depth), Number.POSITIVE_INFINITY);

      visibilityMap.set(candidate.id, candidate.depth === activeDepth);
    });
  });

  return visibilityMap;
};

const collectButtonCandidates = (
  node: LayoutNode,
  frame: Frame,
  depth: number,
  path: string,
  candidates: ButtonCandidate[],
) => {
  candidates.push({
    id: `${path}:edge:top`,
    orientation: 'horizontal',
    family: 'top',
    fixed: frame.y,
    start: frame.x,
    end: frame.x + frame.width,
    depth,
  });
  candidates.push({
    id: `${path}:edge:bottom`,
    orientation: 'horizontal',
    family: 'bottom',
    fixed: frame.y + frame.height,
    start: frame.x,
    end: frame.x + frame.width,
    depth,
  });
  candidates.push({
    id: `${path}:edge:left`,
    orientation: 'vertical',
    family: 'left',
    fixed: frame.x,
    start: frame.y,
    end: frame.y + frame.height,
    depth,
  });
  candidates.push({
    id: `${path}:edge:right`,
    orientation: 'vertical',
    family: 'right',
    fixed: frame.x + frame.width,
    start: frame.y,
    end: frame.y + frame.height,
    depth,
  });

  if (node.type === 'screen') {
    return;
  }

  const shares = resolveShares(node.children);
  let cursor = node.direction === 'row' ? frame.x : frame.y;

  node.children.forEach((child, index) => {
    const span = shares[index];
    const childFrame =
      node.direction === 'row'
        ? { x: cursor, y: frame.y, width: frame.width * span, height: frame.height }
        : { x: frame.x, y: cursor, width: frame.width, height: frame.height * span };

    collectButtonCandidates(child, childFrame, depth + 1, `${path}.${index}`, candidates);

    cursor += node.direction === 'row' ? childFrame.width : childFrame.height;

    if (index < node.children.length - 1) {
      candidates.push({
        id: `${path}:split:${index}`,
        orientation: node.direction === 'row' ? 'vertical' : 'horizontal',
        family: node.direction === 'row' ? 'vertical-split' : 'horizontal-split',
        fixed: cursor,
        start: node.direction === 'row' ? frame.y : frame.x,
        end: node.direction === 'row' ? frame.y + frame.height : frame.x + frame.width,
        depth,
      });
    }
  });
};

const getConflictingFamilies = (family: ButtonFamily): ButtonFamily[] => {
  switch (family) {
    case 'top':
      return ['top', 'horizontal-split'];
    case 'bottom':
      return ['bottom', 'horizontal-split'];
    case 'left':
      return ['left', 'vertical-split'];
    case 'right':
      return ['right', 'vertical-split'];
    case 'horizontal-split':
      return ['horizontal-split'];
    case 'vertical-split':
      return ['vertical-split'];
  }
};

const shiftLightness = (color: OKLCHColor, delta: number): OKLCHColor => ({
  ...color,
  l: clamp(color.l + delta, 0, 1),
});

type LayoutActionPlan = {
  introConfig: LayoutNode;
  finalConfig: LayoutNode;
};

const buildLayoutActionPlan = (config: LayoutNode, action: LayoutAction, nextScreenTemplate: string | number, newInstanceId: string): LayoutActionPlan => {
  if (action.type === 'split') {
    const finalConfig = updateNodeAtPath(config, action.path, (node) => {
      if (node.type !== 'split') {
        return node;
      }

      return {
        ...node,
        children: insertScreenIntoChildren(node.children, action.index + 1, nextScreenTemplate, newInstanceId),
      };
    });

    const introConfig = updateNodeAtPath(config, action.path, (node) => {
      if (node.type !== 'split') {
        return node;
      }

      return {
        ...node,
        children: insertScreenIntoChildrenIntro(node.children, action.index + 1, nextScreenTemplate, newInstanceId),
      };
    });

    return { introConfig, finalConfig };
  }

  const parentInsertResult = buildParentInsertPlanForEdgeAction(config, action, nextScreenTemplate, newInstanceId);

  if (parentInsertResult) {
    return parentInsertResult;
  }

  const finalConfig = updateNodeAtPath(config, action.path, (node) => {
    const targetDirection = directionFromSide(action.side);

    if (node.type === 'split' && node.direction === targetDirection) {
      const insertIndex = action.side === 'top' || action.side === 'left' ? 0 : node.children.length;

      return {
        ...node,
        children: insertScreenIntoChildren(node.children, insertIndex, nextScreenTemplate, newInstanceId),
      };
    }

    return wrapNodeWithScreen(node, action.side, nextScreenTemplate, newInstanceId);
  });

  const introConfig = updateNodeAtPath(config, action.path, (node) => {
    const targetDirection = directionFromSide(action.side);

    if (node.type === 'split' && node.direction === targetDirection) {
      const insertIndex = action.side === 'top' || action.side === 'left' ? 0 : node.children.length;

      return {
        ...node,
        children: insertScreenIntoChildrenIntro(node.children, insertIndex, nextScreenTemplate, newInstanceId),
      };
    }

    return wrapNodeWithScreenIntro(node, action.side, nextScreenTemplate, newInstanceId);
  });

  return { introConfig, finalConfig };
};

const buildParentInsertPlanForEdgeAction = (
  config: LayoutNode,
  action: Extract<LayoutAction, { type: 'edge' }>,
  nextScreenTemplate: string | number,
  newInstanceId: string,
): LayoutActionPlan | null => {
  const parentPath = getParentPath(action.path);

  if (!parentPath) {
    return null;
  }

  const parentNode = getNodeAtPath(config, parentPath);
  const currentIndex = getNodeIndex(action.path);
  const targetDirection = directionFromSide(action.side);

  if (parentNode?.type !== 'split' || parentNode.direction !== targetDirection || currentIndex === null) {
    return null;
  }

  const insertIndex = action.side === 'top' || action.side === 'left' ? currentIndex : currentIndex + 1;

  const finalConfig = updateNodeAtPath(config, parentPath, (node) => {
    if (node.type !== 'split') {
      return node;
    }

    return {
      ...node,
      children: insertScreenIntoChildren(node.children, insertIndex, nextScreenTemplate, newInstanceId),
    };
  });

  const introConfig = updateNodeAtPath(config, parentPath, (node) => {
    if (node.type !== 'split') {
      return node;
    }

    return {
      ...node,
      children: insertScreenIntoChildrenIntro(node.children, insertIndex, nextScreenTemplate, newInstanceId),
    };
  });

  return { introConfig, finalConfig };
};

const directionFromSide = (side: Side): Direction => {
  if (side === 'left' || side === 'right') {
    return 'row';
  }

  return 'column';
};

const insertScreenIntoChildren = (children: LayoutNode[], insertIndex: number, screenTemplate: string | number, instanceId: string): LayoutNode[] => {
  const normalizedIndex = clamp(insertIndex, 0, children.length);
  const nextShare = 1 / (children.length + 1);
  const scaledShares = resolveShares(children).map((share) => share * (1 - nextShare));
  const rebuiltChildren = children.map((child, index) => ({
    ...child,
    size: formatPercent(scaledShares[index] * 100),
  }));

  rebuiltChildren.splice(normalizedIndex, 0, {
    type: 'screen',
    id: instanceId,
    screenTemplate,
    size: formatPercent(nextShare * 100),
  });

  return rebuiltChildren;
};

const insertScreenIntoChildrenIntro = (children: LayoutNode[], insertIndex: number, screenTemplate: string | number, instanceId: string): LayoutNode[] => {
  const normalizedIndex = clamp(insertIndex, 0, children.length);
  const currentShares = resolveShares(children);
  const rebuiltChildren = children.map((child, index) => ({
    ...child,
    size: formatPercent(currentShares[index] * 100),
  }));

  rebuiltChildren.splice(normalizedIndex, 0, {
    type: 'screen',
    id: instanceId,
    screenTemplate,
    size: '0%',
  });

  return rebuiltChildren;
};

const wrapNodeWithScreen = (node: LayoutNode, side: Side, screenTemplate: string | number, instanceId: string): SplitNode => {
  const wrappedNode: LayoutNode = {
    ...node,
    size: '50%',
  };
  const newScreen: ScreenNode = {
    type: 'screen',
    id: instanceId,
    screenTemplate,
    size: '50%',
  };

  return {
    type: 'split',
    direction: directionFromSide(side),
    size: node.size,
    children: side === 'top' || side === 'left' ? [newScreen, wrappedNode] : [wrappedNode, newScreen],
  };
};

const wrapNodeWithScreenIntro = (node: LayoutNode, side: Side, screenTemplate: string | number, instanceId: string): SplitNode => {
  const wrappedNode: LayoutNode = {
    ...node,
    size: '100%',
  };
  const newScreen: ScreenNode = {
    type: 'screen',
    id: instanceId,
    screenTemplate,
    size: '0%',
  };

  return {
    type: 'split',
    direction: directionFromSide(side),
    size: node.size,
    children: side === 'top' || side === 'left' ? [newScreen, wrappedNode] : [wrappedNode, newScreen],
  };
};

const updateNodeAtPath = (node: LayoutNode, path: string, updater: (current: LayoutNode) => LayoutNode): LayoutNode => {
  if (path === 'root') {
    return updater(node);
  }

  const segments = path
    .split('.')
    .slice(1)
    .map((segment) => Number.parseInt(segment, 10))
    .filter((segment) => Number.isFinite(segment));

  return updateNodeBySegments(node, segments, updater);
};

const getNodeAtPath = (node: LayoutNode, path: string): LayoutNode | null => {
  if (path === 'root') {
    return node;
  }

  const segments = path
    .split('.')
    .slice(1)
    .map((segment) => Number.parseInt(segment, 10))
    .filter((segment) => Number.isFinite(segment));

  let current: LayoutNode = node;

  for (const segment of segments) {
    if (current.type !== 'split') {
      return null;
    }

    const next = current.children[segment];

    if (!next) {
      return null;
    }

    current = next;
  }

  return current;
};

const getParentPath = (path: string) => {
  if (path === 'root') {
    return null;
  }

  const segments = path.split('.');
  segments.pop();
  return segments.join('.');
};

const getNodeIndex = (path: string) => {
  if (path === 'root') {
    return null;
  }

  const segments = path.split('.');
  const lastSegment = segments[segments.length - 1];
  const parsed = Number.parseInt(lastSegment, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const removeNodeAtPath = (config: LayoutNode, path: string): LayoutNode => {
  const parentPath = getParentPath(path);
  const index = getNodeIndex(path);

  if (!parentPath || index === null) {
    return config;
  }

  return updateNodeAtPath(config, parentPath, (node) => {
    if (node.type !== 'split') return node;
    const newChildren = [...node.children];
    newChildren.splice(index, 1);

    if (newChildren.length === 1) {
      const child = newChildren[0];
      return { ...child, size: node.size ?? child.size };
    }

    return { ...node, children: newChildren };
  });
};

const buildClosePlan = (config: LayoutNode, path: string): LayoutNode => {
  return updateNodeAtPath(config, path, (node) => {
    if (node.type !== 'screen') return node;
    return { ...node, size: '0%' };
  });
};

const updateNodeBySegments = (node: LayoutNode, segments: number[], updater: (current: LayoutNode) => LayoutNode): LayoutNode => {
  if (segments.length === 0) {
    return updater(node);
  }

  if (node.type !== 'split') {
    return node;
  }

  const [head, ...rest] = segments;

  return {
    ...node,
    children: node.children.map((child, index) => {
      if (index !== head) {
        return child;
      }

      return updateNodeBySegments(child, rest, updater);
    }),
  };
};

const formatPercent = (value: number) => `${Number(value.toFixed(3))}%`;

const summarizeLayout = (node: LayoutNode): string => {
  if (node.type === 'screen') {
    return `screen(${node.id}:${String(node.screenTemplate)}:${String(node.size ?? 'auto')})`;
  }

  return `${node.direction}[${node.children.map((child) => summarizeLayout(child)).join(',')}]`;
};

const walkLayout = (node: LayoutNode, visitor: (node: LayoutNode) => void) => {
  visitor(node);

  if (node.type === 'split') {
    node.children.forEach((child) => walkLayout(child, visitor));
  }
};
