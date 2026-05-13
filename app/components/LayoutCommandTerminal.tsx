import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { LayoutHoverInfo, CurrentAction, LayoutNode } from './Layout';
import { collectInstances } from './layoutUtils';

interface LayoutCommandTerminalProps {
    hoverInfo: LayoutHoverInfo | null;
    currentAction: CurrentAction;
    nextScreenTemplate: string | number;
    config: LayoutNode;
    lines: string[];
    onRunCommand: (command: string) => void;
}

export const LayoutCommandTerminal: React.FC<LayoutCommandTerminalProps> = ({
    hoverInfo,
    currentAction,
    nextScreenTemplate,
    config,
    lines,
    onRunCommand,
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
