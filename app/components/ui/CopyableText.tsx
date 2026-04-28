import React, { useState, createContext, useContext } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Copy } from 'lucide-react-native';
import {
    FadeIn,
    FadeOut,
    ZoomIn,
    ZoomOut,
} from 'react-native-reanimated';
import FontText from '../ui/text/FontText';
import Row from '../layout/Row';
import Column from '../layout/Column';
import StateAnimatedView from '../ui/StateAnimatedView';
import { useCSSVariable } from 'uniwind';

const CopyableContext = createContext<{
    copied: boolean;
    handleCopy: () => void;
} | null>(null);

interface CopyableTextProps {
    text: string;
    prefix?: string;
    className?: string;
    copyText?: string;
    color?: string | 'text-inverted';
    copied?: boolean;
}

interface CopyableTextContainerProps {
    className?: string;
    copyText?: string;
    color?: string | 'text-inverted';
    children?: React.ReactNode;
}

const CopyableText = ({ text, prefix = '', className = '', copyText = 'Copied', color, copied: externalCopied }: CopyableTextProps) => {
    const [internalCopied, setInternalCopied] = useState(false);
    const copyableContext = useContext(CopyableContext);
    
    // Use context if available, otherwise use external prop or internal state
    const copied = copyableContext?.copied ?? externalCopied ?? internalCopied;

    const resolvedColor = String(useCSSVariable(`--color-${color}`) || color);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        if (copyableContext) {
            copyableContext.handleCopy();
        } else if (externalCopied === undefined) {
            setInternalCopied(true);
            setTimeout(() => setInternalCopied(false), 2000);
        }
    };
    const fullText = `${prefix}${text}`;

    const content = (
        <Row className={`gap-1 items-center justify-center w-fit ${className}`}>
            <View className="items-center">
                <FontText variant='cardHeader' style={{ color: 'transparent' }}>
                    {fullText}
                </FontText>



                <View className="absolute">
                    <StateAnimatedView.Container stateVar={copied}>
                        <StateAnimatedView.Option
                            stateValue={false}
                            onValue={FadeIn.duration(100)}
                            onNotValue={FadeOut.duration(100)}
                        >
                            <FontText variant='lowercaseCardHeader' className='opacity-100' style={{ color: resolvedColor }}>
                                {fullText}
                            </FontText>
                        </StateAnimatedView.Option>

                        <StateAnimatedView.Option
                            stateValue={true}
                            onValue={ZoomIn.duration(150)}
                            onNotValue={ZoomOut.duration(150)}
                        >

                            <FontText variant='cardHeader' className='opacity-100' style={{ color: resolvedColor }}>
                                {copyText}
                            </FontText>

                        </StateAnimatedView.Option>
                    </StateAnimatedView.Container>
                </View>
            </View>
            <View className=''>
                <Copy size={12} color={resolvedColor} />
            </View>
        </Row>
    );

    // Only wrap with TouchableOpacity if we're handling our own copy logic
    if (externalCopied === undefined) {
        return (
            <TouchableOpacity onPress={handleCopy}>
                {content}
            </TouchableOpacity>
        );
    }

    return content;
};

export default CopyableText;

// Container component that provides context to child CopyableText components
CopyableText.Container = ({ className = '', copyText = 'Copied', color, children }: CopyableTextContainerProps) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const contextValue = {
        copied,
        handleCopy
    };

    return (
        <CopyableContext.Provider value={contextValue}>
            <TouchableOpacity onPress={handleCopy}>
                <Column className={`gap-0 ${className ?? ''}`.trim()}>
                    {children}
                </Column>
            </TouchableOpacity>
        </CopyableContext.Provider>
    );
};
