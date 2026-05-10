import React from 'react';
import { Text, View } from 'react-native';

const LibraryScreen = () => (
  <View style={{ flex: 1, backgroundColor: '#071a13', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
    <View style={{ gap: 8, padding: 18, borderRadius: 18, backgroundColor: 'rgba(134,239,172,0.82)' }}>
      <Text style={{ color: '#052e16', fontWeight: '800', fontSize: 18 }}>Library</Text>
      {['Documents', 'Saved views', 'References'].map((item) => (
        <Text key={item} style={{ color: '#166534', fontWeight: '600' }}>{item}</Text>
      ))}
    </View>
  </View>
);

export default LibraryScreen;
