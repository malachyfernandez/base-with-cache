import React, { useState } from 'react';
import { View, Text } from 'react-native';
import Layout, { LayoutHoverInfo, LayoutNode, CurrentAction, LayoutAction } from './Layout';
import { LayoutCommandTerminal } from './LayoutCommandTerminal';
import {
    parseNumericId,
    swapScreensByInstanceId,
    findActionByButtonId,
    moveInstanceToNewBlankSlot,
    swapScreenTemplateAtPathWithInstanceId,
} from './layoutUtils';

/* ───────── Example layout config ───────── */

const exampleConfig: LayoutNode = {
    type: 'split',
    direction: 'row',
    children: [
        {
            type: 'split',
            direction: 'column',
            size: '74%',
            children: [
                {
                    type: 'split',
                    direction: 'row',
                    size: '48%',
                    children: [
                        { type: 'screen', id: 'inst-1', screenTemplate: 1, size: '38%' },
                        { type: 'screen', id: 'inst-2', screenTemplate: 2, size: '62%' },
                    ],
                },
                { type: 'screen', id: 'inst-3', screenTemplate: 3, size: '52%' },
            ],
        },
        { type: 'screen', id: 'inst-4', screenTemplate: 4, size: '26%' },
    ],
};

/* ───────── Blank screen ───────── */

export const BlankScreen = () => (
    <View style={{ flex: 1, backgroundColor: '#050505', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#888', fontWeight: '700' }}>Blank</Text>
    </View>
);

/* ───────── Layout manager ───────── */

export const LayoutManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<LayoutNode>(exampleConfig);
    const [nextScreenTemplate, setNextScreenTemplate] = useState<string | number>(1);
    const [hoverInfo, setHoverInfo] = useState<LayoutHoverInfo | null>(null);
    const [currentAction, setCurrentAction] = useState<CurrentAction>({ phase: 'idle' });
    const [terminalLines, setTerminalLines] = useState<string[]>(['Layout terminal ready. Try: swap inst-1 inst-4, swap-blank inst-1 root:edge:right, next 2, next blank, use-hover-next, swap-hover inst-2']);

    // Transition duration for theme property animations
    const themeTransitionDurationMs = 300;

    // Base theme configuration
    const baseTheme = {
        borderWidth: 30,
        gapWidth: 30,
        inactiveButtonThicknessRatio: 0.33,
        outerButtonOpacity: 1,

        borderRadius: 60,
        buttonSpanRatio: 0.7,
        contrastStep: -0.03,
        hoverBrightness: 0.05,

        canvasColor: { l: 0.18, c: 0, h: 0 },
        panelColor: { l: 0.3, c: 0, h: 0 },
        buttonColor: { l: 0.35, c: 0.03, h: 320 },

        buttonClassName: 'border-[1px] border-text/20 scale-70',

        wireframeVisible: true,
        wireframeBorderColor: { l: 1, c: 0, h: 0 },
        wireframeBorderOpacity: 0.85,
        wireframeBorderWidth: 1,
        wireframeBackgroundColor: { l: 0.28, c: 0, h: 0 },
        wireframeBackgroundOpacity: 0.8,
        wireframeBlurIntensity: 8,
        wireframeBlurTint: 'dark' as const,
        wireframeRadiusOffset: 0,

        hoveredButtonVisible: true,
        hoveredButtonClassName: 'rounded-full scale-70',
        hoveredButtonColor: { l: 1, c: 0, h: 0 },
        hoveredButtonBorderColor: { l: 1, c: 0, h: 0 },
        hoveredButtonBorderOpacity: 0,
        hoveredButtonBorderWidth: 1,
        hoveredButtonBackgroundColor: { l: 1, c: 0, h: 0 },
        hoveredButtonBackgroundOpacity: 0,
        hoveredButtonBlurIntensity: 24,
        hoveredButtonBlurTint: 'light' as const,
        hoveredButtonHoverBrightness: 0.04,
        hoveredButtonRadiusOffset: 0,

        wireframeFadeInHoldDuration: 100,
        wireframeFadeOutHoldDuration: 200,

        screenScale: 0.8,
    };

    // Compute theme based on drag state
    const isDragging = currentAction.phase === 'drag';
    const computedTheme = React.useMemo(() => {
        if (isDragging) {
            return baseTheme;
        } else {
            return {
                ...baseTheme,
                borderWidth: baseTheme.gapWidth * baseTheme.inactiveButtonThicknessRatio,
                inactiveButtonThicknessRatio: 1,
                outerButtonOpacity: 0,
            };
        }
    }, [isDragging, baseTheme]);

    const handleConfigChange = React.useCallback((newConfig: LayoutNode) => {
        setConfig(newConfig);
    }, []);

    const runCommand = React.useCallback((rawCommand: string) => {
        const command = rawCommand.trim();
        const [name, ...args] = command.split(/\s+/);
        const append = (line: string) => setTerminalLines((prev) => [line, ...prev].slice(0, 24));
        const mutateConfig = (updater: (node: LayoutNode) => LayoutNode) => {
            setConfig((current) => {
                const next = updater(current);
                return next;
            });
        };

        if (!command) return;

        if (name === 'next') {
            const value = args[0];
            if (!value) {
                append('Usage: next <screenTemplate|blank>');
                return;
            }
            setNextScreenTemplate(value === 'blank' ? 'blank' : parseNumericId(value) ?? value);
            append(`Next created screen template set to ${value}`);
            return;
        }

        if (name === 'use-hover-next') {
            if (hoverInfo?.type !== 'component') {
                append('Hover a component first.');
                return;
            }
            setNextScreenTemplate(hoverInfo.templateId);
            append(`Next created screen template set to hovered template ${String(hoverInfo.templateId)}`);
            return;
        }

        if (name === 'swap') {
            const first = args[0];
            const second = args[1];
            if (!first || !second) {
                append('Usage: swap <instanceIdA> <instanceIdB>');
                return;
            }
            mutateConfig((current) => swapScreensByInstanceId(current, first, second));
            append(`Swapped instances ${first} and ${second}`);
            return;
        }

        if (name === 'swap-blank') {
            const sourceInstanceId = args[0];
            const buttonId = args[1];
            if (!sourceInstanceId || !buttonId) {
                append('Usage: swap-blank <sourceInstanceId> <buttonId>');
                return;
            }
            const action = findActionByButtonId(config, buttonId);
            if (!action) {
                append(`Button not found: ${buttonId}`);
                return;
            }
            mutateConfig((current) => moveInstanceToNewBlankSlot(current, sourceInstanceId, action));
            append(`Moved ${sourceInstanceId} into new blank slot at ${buttonId}`);
            return;
        }

        if (name === 'swap-hover') {
            const targetInstanceId = args[0];
            if (hoverInfo?.type !== 'component' || !targetInstanceId) {
                append('Usage: hover a component, then swap-hover <instanceId>');
                return;
            }
            mutateConfig((current) => swapScreenTemplateAtPathWithInstanceId(current, hoverInfo.slotId, targetInstanceId));
            append(`Swapped hovered slot ${hoverInfo.slotId} with instance ${targetInstanceId}`);
            return;
        }

        append(`Unknown command: ${command}`);
    }, [config, hoverInfo]);

    const handleSwapDrop = React.useCallback((source: LayoutHoverInfo & { type: 'component' }, target: LayoutHoverInfo | null) => {
        if (!target) return;
        if (target.type === 'component') {
            if (source.instanceId !== target.instanceId) {
                runCommand(`swap ${source.instanceId} ${target.instanceId}`);
            }
            return;
        }
        runCommand(`swap-blank ${source.instanceId} ${target.buttonId}`);
    }, [runCommand]);

    return (
        <View style={{ width: '100%', height: '100%', padding: 24, backgroundColor: 'rgb(20, 20, 20)', flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1 }}>
                <Layout
                    config={config}
                    addPageButtonsEnabled={isDragging}
                    onConfigChange={handleConfigChange}
                    onHoverInfoChange={setHoverInfo}
                    onActionStateChange={setCurrentAction}
                    onSwapDrop={handleSwapDrop}
                    nextScreenTemplate={nextScreenTemplate}
                    hoverDelayMs={100}
                    themeTransitionDurationMs={themeTransitionDurationMs}
                    theme={computedTheme}
                >
                    {children}
                </Layout>
            </View>
            <LayoutCommandTerminal
                hoverInfo={hoverInfo}
                currentAction={currentAction}
                nextScreenTemplate={nextScreenTemplate}
                config={config}
                lines={terminalLines}
                onRunCommand={runCommand}
            />
        </View>
    );
};
