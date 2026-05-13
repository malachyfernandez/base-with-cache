import React from 'react';
import Layout from './Layout';
import { LayoutManager, BlankScreen } from './LayoutManager';
import AnalyticsScreen from './demoScreens/AnalyticsScreen';
import CalendarScreen from './demoScreens/CalendarScreen';
import ComposerScreen from './demoScreens/ComposerScreen';
import LibraryScreen from './demoScreens/LibraryScreen';

const MainPage: React.FC = () => (
    <LayoutManager>
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
    </LayoutManager>
);

export default MainPage;
