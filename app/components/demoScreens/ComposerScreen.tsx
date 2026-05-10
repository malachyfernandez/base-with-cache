import React from 'react';
import { Text, TextInput, View } from 'react-native';

const ComposerScreen = () => (
  <View style={{ flex: 1, backgroundColor: '#180d1f', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
    <View style={{ width: '80%', maxWidth: 420, padding: 16, borderRadius: 18, backgroundColor: 'rgba(216,180,254,0.86)' }}>
      <Text style={{ color: '#3b0764', fontWeight: '800', fontSize: 18 }}>Composer</Text>
      <TextInput
        value=""
        editable={false}
        placeholder="Draft a note..."
        placeholderTextColor="#6b21a8"
        style={{ marginTop: 10, minHeight: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.55)', paddingHorizontal: 12, color: '#3b0764' }}
      />
    </View>
  </View>
);

export default ComposerScreen;
