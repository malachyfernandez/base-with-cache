import React, { useState } from 'react';
import { View } from 'react-native';
import Layout, { LayoutNode } from './Layout';
import { DemoContent } from './DemoContent';

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
                        { type: 'screen', screenId: 1, size: '38%' },
                        { type: 'screen', screenId: 2, size: '62%' },
                    ],
                },
                { type: 'screen', screenId: 3, size: '52%' },
            ],
        },
        { type: 'screen', screenId: 4, size: '26%' },
    ],
};

/* ───────── Page ───────── */

const MainPage: React.FC = () => {
    const [config, setConfig] = useState<LayoutNode>(exampleConfig);

    React.useEffect(() => {
        console.log('[MainPage] config state updated:', JSON.stringify(config, null, 2));
    }, [config]);

    const extractScreenSizes = React.useCallback((node: LayoutNode): Record<string, string> => {
        const result: Record<string, string> = {};
        const walk = (n: LayoutNode) => {
            if (n.type === 'screen') {
                result[String(n.screenId)] = String(n.size ?? 'auto');
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

// HERE

    return (
        <View style={{ width: '100%', height: '100%', padding: 24, backgroundColor: 'rgb(20, 20, 20)' }}>
            <Layout
                config={config}
                onConfigChange={handleConfigChange}
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

                    screenScale: 0.7,
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
                <Layout.Screen screenId={1}>
                    <DemoContent text="Screen" screenId={1} />
                </Layout.Screen>
                <Layout.Screen screenId={2}>
                    <DemoContent text="Screen" screenId={2} />
                </Layout.Screen>
                <Layout.Screen screenId={3}>
                    <DemoContent text="Screen" screenId={3} />
                </Layout.Screen>
                <Layout.Screen screenId={4}>
                    <DemoContent text="Screen" screenId={4} />
                </Layout.Screen>
            </Layout>
        </View>
    );
};

export default MainPage;
