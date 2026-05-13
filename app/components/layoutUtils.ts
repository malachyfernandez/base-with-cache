import { LayoutNode, LayoutAction, ScreenNode, SplitNode } from './Layout';

export const parseNumericId = (value: string | undefined): string | number | undefined => {
    if (value === undefined) return undefined;
    const numeric = Number(value);
    return Number.isFinite(numeric) && String(numeric) === value ? numeric : value;
};

export const swapScreensByInstanceId = (node: LayoutNode, firstId: string, secondId: string): LayoutNode => {
    let firstTemplate: string | number | undefined;
    let secondTemplate: string | number | undefined;

    const collect = (n: LayoutNode) => {
        if (n.type === 'screen') {
            if (n.id === firstId) firstTemplate = n.screenTemplate;
            if (n.id === secondId) secondTemplate = n.screenTemplate;
        } else {
            n.children.forEach(collect);
        }
    };
    collect(node);

    if (firstTemplate === undefined || secondTemplate === undefined) return node;

    const swap = (n: LayoutNode): LayoutNode => {
        if (n.type === 'screen') {
            if (n.id === firstId) return { ...n, screenTemplate: secondTemplate! };
            if (n.id === secondId) return { ...n, screenTemplate: firstTemplate! };
            return n;
        }
        return { ...n, children: n.children.map(swap) };
    };

    return swap(node);
};

export const findActionByButtonId = (node: LayoutNode, buttonId: string): LayoutAction | null => {
    const match = buttonId.match(/^(.*):(edge|split):([^:]+)$/);
    if (!match) return null;
    const [, path, type, value] = match;
    if (!getNodeAtPath(node, path)) return null;
    if (type === 'edge') {
        if (value !== 'top' && value !== 'right' && value !== 'bottom' && value !== 'left') return null;
        return { type: 'edge', key: buttonId, path, side: value };
    }
    const splitNode = getNodeAtPath(node, path);
    const index = Number.parseInt(value, 10);
    if (splitNode?.type !== 'split' || !Number.isFinite(index)) return null;
    return { type: 'split', key: buttonId, path, index, direction: splitNode.direction };
};

export const moveInstanceToNewBlankSlot = (node: LayoutNode, sourceInstanceId: string, action: LayoutAction): LayoutNode => {
    const source = findScreenByInstanceId(node, sourceInstanceId);
    if (!source) return node;
    const newInstanceId = getNextInstanceId(node);
    const withBlankSource = updateScreenTemplateAtPath(node, source.path, 'blank');
    return insertScreenForAction(withBlankSource, action, source.screen.screenTemplate, newInstanceId);
};

export const findScreenByInstanceId = (node: LayoutNode, instanceId: string, path: string = 'root'): { path: string; screen: ScreenNode } | null => {
    if (node.type === 'screen') {
        return node.id === instanceId ? { path, screen: node } : null;
    }
    for (let index = 0; index < node.children.length; index++) {
        const found = findScreenByInstanceId(node.children[index], instanceId, `${path}.${index}`);
        if (found) return found;
    }
    return null;
};

export const getNextInstanceId = (node: LayoutNode): string => {
    let max = 0;
    const walk = (n: LayoutNode) => {
        if (n.type === 'screen') {
            const match = n.id.match(/^inst-(\d+)$/);
            if (match) max = Math.max(max, Number.parseInt(match[1], 10));
            return;
        }
        n.children.forEach(walk);
    };
    walk(node);
    return `inst-${max + 1}`;
};

export const insertScreenForAction = (node: LayoutNode, action: LayoutAction, screenTemplate: string | number, instanceId: string): LayoutNode => {
    if (action.type === 'split') {
        return updateNodeAtPath(node, action.path, (current) => {
            if (current.type !== 'split') return current;
            return { ...current, children: insertScreenIntoChildren(current.children, action.index + 1, screenTemplate, instanceId) };
        });
    }

    const parentPath = getParentPath(action.path);
    const currentIndex = getNodeIndex(action.path);
    const targetDirection = action.side === 'left' || action.side === 'right' ? 'row' : 'column';
    const parentNode = parentPath ? getNodeAtPath(node, parentPath) : null;

    if (parentPath && parentNode?.type === 'split' && parentNode.direction === targetDirection && currentIndex !== null) {
        const insertIndex = action.side === 'top' || action.side === 'left' ? currentIndex : currentIndex + 1;
        return updateNodeAtPath(node, parentPath, (current) => {
            if (current.type !== 'split') return current;
            return { ...current, children: insertScreenIntoChildren(current.children, insertIndex, screenTemplate, instanceId) };
        });
    }

    return updateNodeAtPath(node, action.path, (current) => {
        if (current.type === 'split' && current.direction === targetDirection) {
            const insertIndex = action.side === 'top' || action.side === 'left' ? 0 : current.children.length;
            return { ...current, children: insertScreenIntoChildren(current.children, insertIndex, screenTemplate, instanceId) };
        }
        return wrapNodeWithScreen(current, action.side, screenTemplate, instanceId);
    });
};

export const swapScreenTemplateAtPathWithInstanceId = (node: LayoutNode, path: string, targetInstanceId: string): LayoutNode => {
    const targetPath = findFirstScreenPathByInstanceId(node, targetInstanceId);
    if (!targetPath) return node;
    const sourceNode = getNodeAtPath(node, path);
    const targetNode = getNodeAtPath(node, targetPath);
    if (sourceNode?.type !== 'screen' || targetNode?.type !== 'screen') return node;

    return updateScreenTemplateAtPath(
        updateScreenTemplateAtPath(node, path, targetNode.screenTemplate),
        targetPath,
        sourceNode.screenTemplate,
    );
};

export const findFirstScreenPathByInstanceId = (node: LayoutNode, instanceId: string, path: string = 'root'): string | null => {
    if (node.type === 'screen') {
        return node.id === instanceId ? path : null;
    }

    for (let index = 0; index < node.children.length; index++) {
        const found = findFirstScreenPathByInstanceId(node.children[index], instanceId, `${path}.${index}`);
        if (found) return found;
    }

    return null;
};

export const getNodeAtPath = (node: LayoutNode, path: string): LayoutNode | null => {
    if (path === 'root') return node;
    const segments = path.split('.').slice(1).map((segment) => Number.parseInt(segment, 10));
    let current: LayoutNode = node;

    for (const segment of segments) {
        if (current.type !== 'split' || !Number.isFinite(segment) || !current.children[segment]) return null;
        current = current.children[segment];
    }

    return current;
};

export const updateNodeAtPath = (node: LayoutNode, path: string, updater: (current: LayoutNode) => LayoutNode): LayoutNode => {
    if (path === 'root') return updater(node);
    if (node.type !== 'split') return node;
    const [head, ...rest] = path.split('.').slice(1);
    const index = Number.parseInt(head, 10);
    const childPath = `root${rest.length > 0 ? `.${rest.join('.')}` : ''}`;
    return {
        ...node,
        children: node.children.map((child, childIndex) => (
            childIndex === index ? updateNodeAtPath(child, childPath, updater) : child
        )),
    };
};

export const getParentPath = (path: string) => {
    if (path === 'root') return null;
    const segments = path.split('.');
    segments.pop();
    return segments.join('.');
};

export const getNodeIndex = (path: string) => {
    if (path === 'root') return null;
    const segments = path.split('.');
    const parsed = Number.parseInt(segments[segments.length - 1] ?? '', 10);
    return Number.isFinite(parsed) ? parsed : null;
};

export const insertScreenIntoChildren = (children: LayoutNode[], insertIndex: number, screenTemplate: string | number, instanceId: string): LayoutNode[] => {
    const normalizedIndex = Math.min(children.length, Math.max(0, insertIndex));
    const nextShare = 1 / (children.length + 1);
    const scaledShares = resolveShares(children).map((share) => share * (1 - nextShare));
    const rebuiltChildren = children.map((child, index) => ({
        ...child,
        size: formatPercent(scaledShares[index] * 100),
    }));
    rebuiltChildren.splice(normalizedIndex, 0, {
        type: 'screen',
        id: instanceId,
        screenTemplate,
        size: formatPercent(nextShare * 100),
    });
    return rebuiltChildren;
};

export const wrapNodeWithScreen = (node: LayoutNode, side: 'top' | 'right' | 'bottom' | 'left', screenTemplate: string | number, instanceId: string): SplitNode => {
    const wrappedNode: LayoutNode = { ...node, size: '50%' };
    const newScreen: ScreenNode = { type: 'screen', id: instanceId, screenTemplate, size: '50%' };
    return {
        type: 'split',
        direction: side === 'left' || side === 'right' ? 'row' : 'column',
        size: node.size,
        children: side === 'top' || side === 'left' ? [newScreen, wrappedNode] : [wrappedNode, newScreen],
    };
};

export const resolveShares = (children: LayoutNode[]) => {
    const explicitValues = children.map((child) => parseExplicitPercent(child.size));
    const totalExplicit = explicitValues.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    const unspecifiedCount = explicitValues.filter((value) => value === null).length;
    const remaining = Math.max(100 - totalExplicit, 0);
    const fallbackShare = unspecifiedCount > 0 ? remaining / unspecifiedCount : 0;
    const rawShares = explicitValues.map((value) => value !== null ? value : remaining > 0 ? fallbackShare : 100 / Math.max(children.length, 1));
    const total = rawShares.reduce((sum, value) => sum + value, 0) || 1;
    return rawShares.map((value) => value / total);
};

export const parseExplicitPercent = (size?: string | number) => {
    if (size === undefined) return null;
    if (typeof size === 'number') return size;
    const parsed = Number.parseFloat(size.replace('%', ''));
    return Number.isFinite(parsed) ? parsed : null;
};

export const formatPercent = (value: number) => `${Number(value.toFixed(3))}%`;

export const updateScreenTemplateAtPath = (node: LayoutNode, path: string, screenTemplate: string | number): LayoutNode => {
    if (path === 'root') {
        return node.type === 'screen' ? { ...node, screenTemplate } : node;
    }

    if (node.type !== 'split') return node;
    const [head, ...rest] = path.split('.').slice(1);
    const index = Number.parseInt(head, 10);
    const childPath = `root${rest.length > 0 ? `.${rest.join('.')}` : ''}`;

    return {
        ...node,
        children: node.children.map((child, childIndex) => (
            childIndex === index ? updateScreenTemplateAtPath(child, childPath, screenTemplate) : child
        )),
    };
};

export const collectInstances = (node: LayoutNode, path: string = 'root'): { id: string; templateId: string | number; path: string }[] => {
    if (node.type === 'screen') {
        return [{ id: node.id, templateId: node.screenTemplate, path }];
    }
    return node.children.flatMap((child, index) => collectInstances(child, `${path}.${index}`));
};
