import React from 'react';
import { Text, View } from 'react-native';

const AnalyticsScreen = () => (
  <View style={{ flex: 1, backgroundColor: '#08111f', justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16, backgroundColor: 'rgba(147,197,253,0.82)', alignItems: 'center' }}>
      <Text style={{ color: '#0f172a', fontWeight: '800', fontSize: 18 }}>Analytics</Text>
      <Text style={{ color: '#1e3a8a', fontSize: 12, marginTop: 4 }}>Charts, metrics, and insight panels</Text>
    </View>
  </View>
);

export default AnalyticsScreen;
