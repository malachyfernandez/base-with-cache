import React from 'react';
import { Text, View } from 'react-native';

const CalendarScreen = () => (
  <View style={{ flex: 1, backgroundColor: '#211207', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
    <View style={{ padding: 18, borderRadius: 18, backgroundColor: 'rgba(253,186,116,0.86)', alignItems: 'center' }}>
      <Text style={{ color: '#7c2d12', fontWeight: '800', fontSize: 18 }}>Calendar</Text>
      <Text style={{ color: '#9a3412', fontSize: 12, marginTop: 4 }}>Today, deadlines, and schedule blocks</Text>
    </View>
  </View>
);

export default CalendarScreen;
