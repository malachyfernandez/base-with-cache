/**
 * Pretty logging utility for displaying complex objects, arrays, and enums in a readable format
 */

type LoggableData = any;

const prettyLog = (data: LoggableData, title?: string): void => {
    const formatValue = (value: any, indent: number = 0): string => {
        const spaces = '  '.repeat(indent);
        const nextSpaces = '  '.repeat(indent + 1);
        
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        
        // Handle arrays
        if (Array.isArray(value)) {
            if (value.length === 0) return '[]';
            return [
                '[',
                ...value.map(item => `${nextSpaces}${formatValue(item, indent + 1)}`),
                `${spaces}]`
            ].join('\n');
        }
        
        // Handle Date objects before generic object handling
        if (value instanceof Date) {
            return `Date("${value.toISOString()}")`;
        }

        // Handle objects
        if (typeof value === 'object') {
            const keys = Object.keys(value);
            if (keys.length === 0) return '{}';
            
            return [
                '{',
                ...keys.map(key => {
                    const val = value[key];
                    return `${nextSpaces}${key}: ${formatValue(val, indent + 1)}`;
                }),
                `${spaces}}`
            ].join('\n');
        }
        
        // Handle strings
        if (typeof value === 'string') {
            return `"${value}"`;
        }
        
        // Handle other primitives
        return String(value);
    };
    
    const separator = '='.repeat(80);
    const output = [
        separator,
        title ? `🔍 ${title}` : '🔍 Pretty Log',
        separator,
        formatValue(data),
        separator
    ].join('\n');
    
    console.log(output);
};

export default prettyLog;
