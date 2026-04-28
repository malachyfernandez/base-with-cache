import { StyleProp, ViewStyle } from 'react-native';

const GAP_SCALE: Record<string, number> = {
    '0': 0,
    px: 1,
    '0.5': 2,
    '1': 4,
    '1.5': 6,
    '2': 8,
    '2.5': 10,
    '3': 12,
    '3.5': 14,
    '4': 16,
    '5': 20,
    '6': 24,
    '7': 28,
    '8': 32,
    '9': 36,
    '10': 40,
    '11': 44,
    '12': 48,
    '14': 56,
    '16': 64,
    '20': 80,
    '24': 96,
    '28': 112,
    '32': 128,
    '36': 144,
    '40': 160,
    '44': 176,
    '48': 192,
    '52': 208,
    '56': 224,
    '60': 240,
    '64': 256,
    '72': 288,
    '80': 320,
    '96': 384,
};

const DEFAULT_GAP_STYLE: ViewStyle = {
    gap: GAP_SCALE['4'],
};

const GAP_TOKEN_REGEX = /(^|\s)(gap(?:-[xy])?)-([^\s]+)/g;

const parseGapValue = (rawValue: string) => {
    if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
        const arbitraryValue = rawValue.slice(1, -1).trim();
        if (arbitraryValue.endsWith('px')) {
            const numericValue = Number(arbitraryValue.slice(0, -2));
            return Number.isFinite(numericValue) ? numericValue : undefined;
        }
        const numericValue = Number(arbitraryValue);
        return Number.isFinite(numericValue) ? numericValue : undefined;
    }

    return GAP_SCALE[rawValue];
};

export const extractGapStyle = (className?: string) => {
    if (!className) {
        return undefined;
    }

    const gapStyle: ViewStyle = {};
    let match: RegExpExecArray | null = null;

    while ((match = GAP_TOKEN_REGEX.exec(className)) !== null) {
        const gapType = match[2];
        const rawValue = match[3];
        const parsedValue = parseGapValue(rawValue);

        if (parsedValue === undefined) {
            continue;
        }

        if (gapType === 'gap') {
            gapStyle.gap = parsedValue;
            continue;
        }

        if (gapType === 'gap-x') {
            gapStyle.columnGap = parsedValue;
            continue;
        }

        if (gapType === 'gap-y') {
            gapStyle.rowGap = parsedValue;
        }
    }

    return Object.keys(gapStyle).length > 0 ? gapStyle : undefined;
};

export const mergeGapStyle = (className?: string, style?: StyleProp<ViewStyle>) => {
    const gapStyle = extractGapStyle(className);

    if (!gapStyle && !style) {
        return DEFAULT_GAP_STYLE;
    }

    if (!gapStyle) {
        return [DEFAULT_GAP_STYLE, style];
    }

    if (!style) {
        return [DEFAULT_GAP_STYLE, gapStyle];
    }

    return [DEFAULT_GAP_STYLE, gapStyle, style];
};
