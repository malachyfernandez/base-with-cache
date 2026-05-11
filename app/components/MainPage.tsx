import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Layout, { LayoutHoverInfo, LayoutNode, CurrentAction } from './Layout';
import AnalyticsScreen from './demoScreens/AnalyticsScreen';
import CalendarScreen from './demoScreens/CalendarScreen';
import ComposerScreen from './demoScreens/ComposerScreen';
import LibraryScreen from './demoScreens/LibraryScreen';

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

/* ───────── Page ───────── */

const MainPage: React.FC = () => {
    const [config, setConfig] = useState<LayoutNode>(exampleConfig);
    const [nextScreenTemplate, setNextScreenTemplate] = useState<string | number>(1);
    const [hoverInfo, setHoverInfo] = useState<LayoutHoverInfo | null>(null);
    const [currentAction, setCurrentAction] = useState<CurrentAction>({ phase: 'idle' });
    const [terminalLines, setTerminalLines] = useState<string[]>(['Layout terminal ready. Try: swap inst-1 inst-4, next 2, next blank, use-hover-next, swap-hover inst-2']);

    React.useEffect(() => {
        console.log('[MainPage] config state updated:', JSON.stringify(config, null, 2));
    }, [config]);

    const extractScreenSizes = React.useCallback((node: LayoutNode): Record<string, string> => {
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
    }, []);

    const handleConfigChange = React.useCallback((newConfig: LayoutNode) => {
        const configStr = JSON.stringify(newConfig);
        console.log('[MainPage] onConfigChange called, config length:', configStr.length, 'screenSizes:', extractScreenSizes(newConfig));
        setConfig(newConfig);
    }, [extractScreenSizes]);

    const runCommand = React.useCallback((rawCommand: string) => {
        const command = rawCommand.trim();
        const [name, ...args] = command.split(/\s+/);
        const append = (line: string) => setTerminalLines((prev) => [line, ...prev].slice(0, 24));
        const mutateConfig = (updater: (node: LayoutNode) => LayoutNode) => {
            setConfig((current) => {
                const next = updater(current);
                console.log('[MainPage] terminal command config:', JSON.stringify(next, null, 2));
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
    }, [hoverInfo]);

    return (
        <View style={{ width: '100%', height: '100%', padding: 24, backgroundColor: 'rgb(20, 20, 20)', flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1 }}>
                <Layout
                    config={config}
                    onConfigChange={handleConfigChange}
                    onHoverInfoChange={setHoverInfo}
                    onActionStateChange={setCurrentAction}
                    nextScreenTemplate={nextScreenTemplate}
                    hoverDelayMs={100}
                // buttonIcon={<CheckIcon />}
                    theme={{
                        borderWidth: 30,
                        gapWidth: 30,
                        inactiveButtonThicknessRatio: 0.33,
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
                        wireframeBlurTint: 'dark',
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
                        hoveredButtonBlurTint: 'light',
                        hoveredButtonHoverBrightness: 0.04,
                        hoveredButtonRadiusOffset: 0,

                        wireframeFadeInHoldDuration: 100,
                        wireframeFadeOutHoldDuration: 200,

                        screenScale: 1,

                    // HERE
                }}

            // theme={{
            //   borderWidth: 0,
            //   gapWidth: 20,
            //   inactiveButtonThicknessRatio: 0.5,
            //   borderRadius: 0,
            //   buttonSpanRatio: 0.7,
            //   canvasColor: { l: 0.18, c: 0, h: 0 },
            //   panelColor: { l: 0.3, c: 0, h: 0 },
            //   buttonColor: { l: 0.45, c: 0.05, h: 320 },
            //   contrastStep: 0.1,
            //   hoverBrightness: 0.03,

            // }}
                >
                    <Layout.Screen screenTemplate={1}>
                        <AnalyticsScreen />
                    </Layout.Screen>
                    <Layout.Screen screenTemplate={2}>
                        <ComposerScreen />
                    </Layout.Screen>
                    <Layout.Screen screenTemplate={3}>
                        <LibraryScreen />
                    </Layout.Screen>
                    <Layout.Screen screenTemplate={4}>
                        <CalendarScreen />
                    </Layout.Screen>
                    <Layout.Screen screenTemplate="blank">
                        <BlankScreen />
                    </Layout.Screen>
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

const parseNumericId = (value: string | undefined): string | number | undefined => {
    if (value === undefined) return undefined;
    const numeric = Number(value);
    return Number.isFinite(numeric) && String(numeric) === value ? numeric : value;
};

const swapScreensByInstanceId = (node: LayoutNode, firstId: string, secondId: string): LayoutNode => {
    let firstTemplate: string | number | undefined;
    let secondTemplate: string | number | undefined;

    const collect = (n: LayoutNode) => {
        if (n.type === 'screen') {
            if (n.id === firstId) firstTemplate = n.screenTemplate;
            if (n.id === secondId) secondTemplate = n.screenTemplate;
        } else {
            n.children.forEach(collect);
        }
    };
    collect(node);

    if (firstTemplate === undefined || secondTemplate === undefined) return node;

    const swap = (n: LayoutNode): LayoutNode => {
        if (n.type === 'screen') {
            if (n.id === firstId) return { ...n, screenTemplate: secondTemplate! };
            if (n.id === secondId) return { ...n, screenTemplate: firstTemplate! };
            return n;
        }
        return { ...n, children: n.children.map(swap) };
    };

    return swap(node);
};

const swapScreenTemplateAtPathWithInstanceId = (node: LayoutNode, path: string, targetInstanceId: string): LayoutNode => {
    const targetPath = findFirstScreenPathByInstanceId(node, targetInstanceId);
    if (!targetPath) return node;
    const sourceNode = getNodeAtPath(node, path);
    const targetNode = getNodeAtPath(node, targetPath);
    if (sourceNode?.type !== 'screen' || targetNode?.type !== 'screen') return node;

    return updateScreenTemplateAtPath(
        updateScreenTemplateAtPath(node, path, targetNode.screenTemplate),
        targetPath,
        sourceNode.screenTemplate,
    );
};

const findFirstScreenPathByInstanceId = (node: LayoutNode, instanceId: string, path: string = 'root'): string | null => {
    if (node.type === 'screen') {
        return node.id === instanceId ? path : null;
    }

    for (let index = 0; index < node.children.length; index++) {
        const found = findFirstScreenPathByInstanceId(node.children[index], instanceId, `${path}.${index}`);
        if (found) return found;
    }

    return null;
};

const getNodeAtPath = (node: LayoutNode, path: string): LayoutNode | null => {
    if (path === 'root') return node;
    const segments = path.split('.').slice(1).map((segment) => Number.parseInt(segment, 10));
    let current: LayoutNode = node;

    for (const segment of segments) {
        if (current.type !== 'split' || !Number.isFinite(segment) || !current.children[segment]) return null;
        current = current.children[segment];
    }

    return current;
};

const updateScreenTemplateAtPath = (node: LayoutNode, path: string, screenTemplate: string | number): LayoutNode => {
    if (path === 'root') {
        return node.type === 'screen' ? { ...node, screenTemplate } : node;
    }

    if (node.type !== 'split') return node;
    const [head, ...rest] = path.split('.').slice(1);
    const index = Number.parseInt(head, 10);
    const childPath = `root${rest.length > 0 ? `.${rest.join('.')}` : ''}`;

    return {
        ...node,
        children: node.children.map((child, childIndex) => (
            childIndex === index ? updateScreenTemplateAtPath(child, childPath, screenTemplate) : child
        )),
    };
};

const BlankScreen = () => (
    <View style={{ flex: 1, backgroundColor: '#050505', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#888', fontWeight: '700' }}>Blank</Text>
    </View>
);

const collectInstances = (node: LayoutNode, path: string = 'root'): { id: string; templateId: string | number; path: string }[] => {
    if (node.type === 'screen') {
        return [{ id: node.id, templateId: node.screenTemplate, path }];
    }
    return node.children.flatMap((child, index) => collectInstances(child, `${path}.${index}`));
};

const LayoutCommandTerminal = ({
    hoverInfo,
    currentAction,
    nextScreenTemplate,
    config,
    lines,
    onRunCommand,
}: {
    hoverInfo: LayoutHoverInfo | null;
    currentAction: CurrentAction;
    nextScreenTemplate: string | number;
    config: LayoutNode;
    lines: string[];
    onRunCommand: (command: string) => void;
}) => {
    const [command, setCommand] = React.useState('');
    const submit = () => {
        onRunCommand(command);
        setCommand('');
    };

    const instances = React.useMemo(() => collectInstances(config), [config]);

    return (
        <View style={{ width: 330, borderRadius: 18, backgroundColor: '#0d0d0d', borderWidth: 1, borderColor: '#333', padding: 14 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Layout Terminal</Text>
            <Text style={{ color: '#999', marginTop: 8 }}>Next template: {String(nextScreenTemplate)}</Text>
            <Text style={{ color: '#999', marginTop: 4 }}>
                Action: {currentAction.phase === 'idle' ? 'idle' : `${currentAction.phase} ${currentAction.target}(${currentAction.id})`}
            </Text>
            <Text style={{ color: '#999', marginTop: 4 }}>
                Hover: {hoverInfo ? hoverInfo.type === 'component' ? `${hoverInfo.instanceId} (t:${String(hoverInfo.templateId)}) @ ${hoverInfo.slotId}` : `button ${hoverInfo.buttonId}` : 'none'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <TextInput
                    value={command}
                    onChangeText={setCommand}
                    onSubmitEditing={submit}
                    placeholder="swap inst-1 inst-4"
                    placeholderTextColor="#666"
                    style={{ flex: 1, color: '#e7e7e7', borderWidth: 1, borderColor: '#333', borderRadius: 10, paddingHorizontal: 10, minHeight: 38 }}
                />
                <Pressable onPress={submit} style={{ backgroundColor: '#a855f7', borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: '800' }}>Run</Text>
                </Pressable>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {['swap inst-1 inst-4', 'next 2', 'next blank', 'use-hover-next'].map((item) => (
                    <Pressable key={item} onPress={() => onRunCommand(item)} style={{ borderColor: '#444', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Text style={{ color: '#ddd', fontSize: 12 }}>{item}</Text>
                    </Pressable>
                ))}
            </View>
            <View style={{ marginTop: 8 }}>
                <Text style={{ color: '#666', fontSize: 11, marginBottom: 4 }}>Click to append instance ID:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {instances.map((inst) => (
                        <Pressable key={inst.id} onPress={() => setCommand((prev) => `${prev}${prev.length > 0 && !prev.endsWith(' ') ? ' ' : ''}${inst.id}`)} style={{ borderColor: '#555', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                            <Text style={{ color: '#bbb', fontSize: 11 }}>{inst.id}</Text>
                        </Pressable>
                    ))}
                </View>
            </View>
            <ScrollView style={{ marginTop: 12 }}>
                {lines.map((line, index) => (
                    <Text key={`${line}-${index}`} style={{ color: index === 0 ? '#d8b4fe' : '#777', fontFamily: 'monospace', fontSize: 12, marginBottom: 5 }}>
                        $ {line}
                    </Text>
                ))}
            </ScrollView>
        </View>
    );
};

export default MainPage;
