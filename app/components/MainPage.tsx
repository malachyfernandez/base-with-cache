import React from 'react';
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
    return (
        <View style={{ width: '100%', height: '100%', padding: 24, backgroundColor: 'rgb(20, 20, 20)' }}>
            <Layout
                config={exampleConfig}
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
