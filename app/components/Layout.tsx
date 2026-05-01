import React, { Children, isValidElement, ReactNode } from 'react';
import { BlurView } from 'expo-blur';
import { Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

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

const LayoutContext = React.createContext<{
  buttonIcon?: ReactNode;
  layerMode: LayerMode;
  hoveredActionKey?: string | null;
  renderOnlyActionKey?: string | null;
  animationPhase?: 'expand' | 'contract' | null;
  animationDurationMs?: number;
  onActionHoverIn?: (action: LayoutAction) => void;
  onActionHoverOut?: () => void;
  onActionPress?: (action: LayoutAction) => void;
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
  screenId: string | number;
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
};

/* ───────── Layout system ───────── */

type LayoutProps = {
  config: LayoutNode;
  children: ReactNode;
  theme?: Partial<LayoutTheme>;
  buttonIcon?: ReactNode;
  hoverDelayMs?: number;
};

type ScreenSlotProps = {
  screenId: string | number;
  children?: ReactNode;
};

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
};

const SIZE_SPRING = {
  damping: 22,
  stiffness: 260,
  mass: 0.9,
};

const WEB_STAGE_DELAY_MS = 24;

const debugLayout = (...args: unknown[]) => {
  if (Platform.OS === 'web') {
    console.log('[Layout]', ...args);
  }
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

const Layout = ({ config, children, theme, buttonIcon, hoverDelayMs = 300 }: LayoutProps) => {
  const screenMap = new Map<string | number, ReactNode>();

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === LayoutScreen) {
      const props = child.props as ScreenSlotProps;
      screenMap.set(props.screenId, props.children);
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
  const nextScreenIdRef = React.useRef(getNextScreenId(config));
  const animationFrameRefs = React.useRef<number[]>([]);
  const suppressHoverOutUntilRef = React.useRef(0);
  const hoveredActionKeyRef = React.useRef<string | null>(null);
  const hoveredIntroConfigRef = React.useRef<LayoutNode | null>(null);
  const hoveredDurationRef = React.useRef(280);
  const skipNextHoverOutRef = React.useRef(false);
  const containerSizeRef = React.useRef({ width: 1000, height: 600 });
  const wireframeOpacity = useSharedValue(0);
  const wireframeAnimatedStyle = useAnimatedStyle(() => ({ opacity: wireframeOpacity.value }));

  const resolveAnimationDuration = React.useCallback((fromConfig: LayoutNode, toConfig: LayoutNode) => {
    const { width, height } = containerSizeRef.current;
    const fromRects = computeScreenRects(fromConfig, { x: 0, y: 0, width, height });
    const toRects = computeScreenRects(toConfig, { x: 0, y: 0, width, height });
    const distance = computeMaxScreenDistance(fromRects, toRects);
    return getScaledAnimationDuration(distance);
  }, []);

  React.useEffect(() => {
    animationFrameRefs.current.forEach((frameId) => clearScheduledTask(frameId));
    animationFrameRefs.current = [];

    setCommittedConfig(config);
    setWindowConfig(config);
    setAnimateWindowSizes(false);
    setControlsConfig(config);
    setAnimateControlSizes(false);
    setWireframeConfig(null);
    setAnimateWireframeSizes(false);
    setHoveredActionKey(null);
    nextScreenIdRef.current = getNextScreenId(config);
    suppressHoverOutUntilRef.current = 0;
    hoveredActionKeyRef.current = null;
    hoveredIntroConfigRef.current = null;
  }, [config]);

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
      if (hoveredActionKeyRef.current === action.key) {
        return;
      }

      const plan = buildLayoutActionPlan(committedConfig, action, nextScreenIdRef.current);
      const durationMs = resolveAnimationDuration(committedConfig, plan.finalConfig);
      hoveredDurationRef.current = durationMs;
      setAnimationDurationMs(durationMs);

      animationFrameRefs.current.forEach((frameId) => clearScheduledTask(frameId));
      animationFrameRefs.current = [];

      setAnimationPhase('expand');
      setHoveredActionKey(action.key);
      hoveredActionKeyRef.current = action.key;

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
    [committedConfig, hoverDelayMs, resolveAnimationDuration, resolvedTheme.wireframeFadeInHoldDuration],
  );

  const handleActionHoverOut = React.useCallback(() => {
    if (Platform.OS === 'web' && Date.now() < suppressHoverOutUntilRef.current) {
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
  }, [resolvedTheme.wireframeFadeOutHoldDuration]);

  const handleActionPress = React.useCallback((action: LayoutAction) => {
    const nextScreenId = nextScreenIdRef.current;
    const plan = buildLayoutActionPlan(committedConfig, action, nextScreenId);

    if (hoveredActionKeyRef.current === action.key) {
      suppressHoverOutUntilRef.current = Date.now() + 120;
      skipNextHoverOutRef.current = true;
      setAnimationPhase('expand');
      setHoveredActionKey(null);
      hoveredActionKeyRef.current = null;
      hoveredIntroConfigRef.current = null;
      animationFrameRefs.current.forEach((frameId) => clearScheduledTask(frameId));
      animationFrameRefs.current = [];
      commitWebLayoutStage(() => {
        setAnimateWindowSizes(false);
        setAnimateControlSizes(false);
        setAnimateWireframeSizes(false);
        setCommittedConfig(plan.finalConfig);
        setWindowConfig(plan.finalConfig);
        setControlsConfig(plan.finalConfig);
        setWireframeConfig(null);
        wireframeOpacity.value = 0;
      });
      nextScreenIdRef.current = nextScreenId + 1;
      return;
    }

    const windowDuration = resolveAnimationDuration(committedConfig, plan.finalConfig);
    const controlsDuration = resolveAnimationDuration(committedConfig, plan.finalConfig);
    setAnimationDurationMs(windowDuration);
    suppressHoverOutUntilRef.current = Date.now() + windowDuration + 120;
    setAnimationPhase('expand');
    setHoveredActionKey(null);
    hoveredActionKeyRef.current = null;
    hoveredIntroConfigRef.current = null;

    animationFrameRefs.current.forEach((frameId) => clearScheduledTask(frameId));
    animationFrameRefs.current = [];
    animateControlsToConfig(plan.finalConfig, controlsDuration);

    commitWebLayoutStage(() => {
      setAnimateWindowSizes(false);
      setAnimateWireframeSizes(false);
      setCommittedConfig(plan.finalConfig);
      setWindowConfig(plan.introConfig);
      setWireframeConfig(plan.finalConfig);
      wireframeOpacity.value = 1;
    });
    nextScreenIdRef.current = nextScreenId + 1;

    const fadeOutWireframe = scheduleOnWeb(() => {
      wireframeOpacity.value = withTiming(0, { duration: 120 });
    }, windowDuration);

    const frameOne = scheduleOnWeb(() => {
      commitWebLayoutStage(() => {
        setAnimateWindowSizes(true);
      });
      const frameTwo = scheduleOnWeb(() => {
        commitWebLayoutStage(() => {
          setWindowConfig(plan.finalConfig);
        });
        animationFrameRefs.current = animationFrameRefs.current.filter((frameId) => frameId !== frameTwo);
      }, WEB_STAGE_DELAY_MS);

      animationFrameRefs.current.push(frameTwo);
      animationFrameRefs.current = animationFrameRefs.current.filter((frameId) => frameId !== frameOne);
    }, WEB_STAGE_DELAY_MS);
    animationFrameRefs.current.push(frameOne);
  }, [animateControlsToConfig, committedConfig, resolveAnimationDuration]);

  return (
    <View
      style={{ flex: 1, backgroundColor: oklchToCssColor(resolvedTheme.canvasColor) }}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        containerSizeRef.current = { width, height };
      }}
    >
      <LayoutContext.Provider value={{ buttonIcon, layerMode: 'window', animationPhase, animationDurationMs }}>
        <LayoutRenderer
          node={windowConfig}
          screenMap={screenMap}
          theme={resolvedTheme}
          visibilityMap={activeVisibilityMap}
          depth={0}
          path="root"
          layerMode="window"
          animateSizes={animateWindowSizes}
        />
      </LayoutContext.Provider>
      <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
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
};

const LayoutRenderer = ({ node, screenMap, theme, visibilityMap, depth, path, layerMode, animateSizes }: RendererProps) => {
  const panelColor = shiftLightness(theme.panelColor, depth * theme.contrastStep);
  const buttonColor = shiftLightness(theme.buttonColor, depth * theme.contrastStep);
  const isWeb = Platform.OS === 'web';
  const { animationPhase, animationDurationMs } = React.useContext(LayoutContext);
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
    const content = screenMap.get(node.screenId);
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
              {content ?? <FallbackScreen screenId={node.screenId} />}
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

function computeScreenRects(node: LayoutNode, rect: PixelRect): Map<string | number, PixelRect> {
  const result = new Map<string | number, PixelRect>();
  if (node.type === 'screen') {
    result.set(node.screenId, rect);
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

function computeMaxScreenDistance(rectsA: Map<string | number, PixelRect>, rectsB: Map<string | number, PixelRect>): number {
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
      pointerEvents={layerMode === 'controls' ? 'box-none' : layerMode === 'window' ? 'auto' : 'none'}
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

  if (!active) {
    return null;
  }

  const thickness = theme.borderWidth;
  const insetPercent = ((1 - theme.buttonSpanRatio) / 2) * 100;
  const spanPercent = theme.buttonSpanRatio * 100;
  const action: LayoutAction = { type: 'edge', key: `${path}:edge:${side}`, path, side };
  const isInteractive = layerMode === 'controls';
  const isHoveredVisual = layerMode === 'controls' ? false : globalHoveredKey === action.key;

  if (renderOnlyActionKey && renderOnlyActionKey !== action.key) {
    return null;
  }

  const visualConfig = getButtonVisualConfig(theme, layerMode, color, isHoveredVisual);
  const radius = Math.max(thickness / 2 + getButtonRadiusOffset(theme, layerMode), 0);

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
      className={visualConfig.className}
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
    renderOnlyActionKey,
  } = React.useContext(LayoutContext);

  const spacerStyle = direction === 'row' ? { width: active ? full : half } : { height: active ? full : half };

  if (layerMode === 'window' || layerMode === 'wireframe') {
    return <View style={spacerStyle} />;
  }

  if (!active) {
    return <View style={spacerStyle} />;
  }

  const action: LayoutAction = { type: 'split', key: `${path}:split:${index}`, path, index, direction };

  if (renderOnlyActionKey && renderOnlyActionKey !== action.key) {
    return <View style={spacerStyle} />;
  }

  const isInteractive = layerMode === 'controls';
  const isHoveredVisual = layerMode === 'controls' ? false : globalHoveredKey === action.key;
  const visualConfig = getButtonVisualConfig(theme, layerMode, buttonColor, isHoveredVisual);
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

  if (direction === 'row') {
    return (
      <View style={{ width: full, alignItems: 'center', justifyContent: 'center' }}>
        <Pressable
          className={visualConfig.className}
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
            baseButtonStyle,
            { width: full, height: `${theme.buttonSpanRatio * 100}%` },
            visualConfig.style,
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
        className={visualConfig.className}
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
          baseButtonStyle,
          { width: `${theme.buttonSpanRatio * 100}%`, height: full },
          visualConfig.style,
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

const FallbackScreen = ({ screenId }: { screenId: string | number }) => {
  const hue = hueFromId(screenId);

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
        <Text style={{ color: `hsl(${hue}, 50%, 30%)`, fontWeight: '600' }}>Screen {String(screenId)}</Text>
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

const buildLayoutActionPlan = (config: LayoutNode, action: LayoutAction, nextScreenId: number): LayoutActionPlan => {
  if (action.type === 'split') {
    const finalConfig = updateNodeAtPath(config, action.path, (node) => {
      if (node.type !== 'split') {
        return node;
      }

      return {
        ...node,
        children: insertScreenIntoChildren(node.children, action.index + 1, nextScreenId),
      };
    });

    const introConfig = updateNodeAtPath(config, action.path, (node) => {
      if (node.type !== 'split') {
        return node;
      }

      return {
        ...node,
        children: insertScreenIntoChildrenIntro(node.children, action.index + 1, nextScreenId),
      };
    });

    return { introConfig, finalConfig };
  }

  const parentInsertResult = buildParentInsertPlanForEdgeAction(config, action, nextScreenId);

  if (parentInsertResult) {
    return parentInsertResult;
  }

  const finalConfig = updateNodeAtPath(config, action.path, (node) => {
    const targetDirection = directionFromSide(action.side);

    if (node.type === 'split' && node.direction === targetDirection) {
      const insertIndex = action.side === 'top' || action.side === 'left' ? 0 : node.children.length;

      return {
        ...node,
        children: insertScreenIntoChildren(node.children, insertIndex, nextScreenId),
      };
    }

    return wrapNodeWithScreen(node, action.side, nextScreenId);
  });

  const introConfig = updateNodeAtPath(config, action.path, (node) => {
    const targetDirection = directionFromSide(action.side);

    if (node.type === 'split' && node.direction === targetDirection) {
      const insertIndex = action.side === 'top' || action.side === 'left' ? 0 : node.children.length;

      return {
        ...node,
        children: insertScreenIntoChildrenIntro(node.children, insertIndex, nextScreenId),
      };
    }

    return wrapNodeWithScreenIntro(node, action.side, nextScreenId);
  });

  return { introConfig, finalConfig };
};

const buildParentInsertPlanForEdgeAction = (
  config: LayoutNode,
  action: Extract<LayoutAction, { type: 'edge' }>,
  nextScreenId: number,
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
      children: insertScreenIntoChildren(node.children, insertIndex, nextScreenId),
    };
  });

  const introConfig = updateNodeAtPath(config, parentPath, (node) => {
    if (node.type !== 'split') {
      return node;
    }

    return {
      ...node,
      children: insertScreenIntoChildrenIntro(node.children, insertIndex, nextScreenId),
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

const insertScreenIntoChildren = (children: LayoutNode[], insertIndex: number, screenId: number): LayoutNode[] => {
  const normalizedIndex = clamp(insertIndex, 0, children.length);
  const nextShare = 1 / (children.length + 1);
  const scaledShares = resolveShares(children).map((share) => share * (1 - nextShare));
  const rebuiltChildren = children.map((child, index) => ({
    ...child,
    size: formatPercent(scaledShares[index] * 100),
  }));

  rebuiltChildren.splice(normalizedIndex, 0, {
    type: 'screen',
    screenId,
    size: formatPercent(nextShare * 100),
  });

  return rebuiltChildren;
};

const insertScreenIntoChildrenIntro = (children: LayoutNode[], insertIndex: number, screenId: number): LayoutNode[] => {
  const normalizedIndex = clamp(insertIndex, 0, children.length);
  const currentShares = resolveShares(children);
  const rebuiltChildren = children.map((child, index) => ({
    ...child,
    size: formatPercent(currentShares[index] * 100),
  }));

  rebuiltChildren.splice(normalizedIndex, 0, {
    type: 'screen',
    screenId,
    size: '0%',
  });

  return rebuiltChildren;
};

const wrapNodeWithScreen = (node: LayoutNode, side: Side, screenId: number): SplitNode => {
  const wrappedNode: LayoutNode = {
    ...node,
    size: '50%',
  };
  const newScreen: ScreenNode = {
    type: 'screen',
    screenId,
    size: '50%',
  };

  return {
    type: 'split',
    direction: directionFromSide(side),
    size: node.size,
    children: side === 'top' || side === 'left' ? [newScreen, wrappedNode] : [wrappedNode, newScreen],
  };
};

const wrapNodeWithScreenIntro = (node: LayoutNode, side: Side, screenId: number): SplitNode => {
  const wrappedNode: LayoutNode = {
    ...node,
    size: '100%',
  };
  const newScreen: ScreenNode = {
    type: 'screen',
    screenId,
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
    return `screen(${String(node.screenId)}:${String(node.size ?? 'auto')})`;
  }

  return `${node.direction}[${node.children.map((child) => summarizeLayout(child)).join(',')}]`;
};

const getNextScreenId = (node: LayoutNode) => {
  let maxId = 0;

  walkLayout(node, (current) => {
    if (current.type !== 'screen') {
      return;
    }

    const numericId = typeof current.screenId === 'number' ? current.screenId : Number.parseInt(String(current.screenId), 10);

    if (Number.isFinite(numericId)) {
      maxId = Math.max(maxId, numericId);
    }
  });

  return maxId + 1;
};

const walkLayout = (node: LayoutNode, visitor: (node: LayoutNode) => void) => {
  visitor(node);

  if (node.type === 'split') {
    node.children.forEach((child) => walkLayout(child, visitor));
  }
};
