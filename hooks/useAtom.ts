import React, { createContext, useCallback, useContext, useRef, useSyncExternalStore } from 'react';

type SetStateAction<Value> = Value | ((previousValue: Value) => Value);

type Getter = <Value>(atomConfig: Atom<Value>) => Value;
type Setter = <Value, Args extends unknown[], Result>(atomConfig: WritableAtom<Value, Args, Result>, ...args: Args) => Result;
type Read<Value> = (get: Getter) => Value;
type Write<Value, Args extends unknown[], Result> = (get: Getter, set: Setter, ...args: Args) => Result;

interface AtomBase<Value> {
    key: symbol;
    read: Read<Value>;
}

export interface PrimitiveAtom<Value> extends AtomBase<Value> {
    init: Value;
    kind: 'primitive';
}

export interface DerivedAtom<Value> extends AtomBase<Value> {
    kind: 'derived';
}

export interface WritableDerivedAtom<Value, Args extends unknown[] = [SetStateAction<Value>], Result = void> extends AtomBase<Value> {
    kind: 'writable-derived';
    write: Write<Value, Args, Result>;
}

export type Atom<Value> = PrimitiveAtom<Value> | DerivedAtom<Value> | WritableDerivedAtom<Value, any, any>;
export type WritableAtom<Value, Args extends unknown[] = [SetStateAction<Value>], Result = void> = PrimitiveAtom<Value> | WritableDerivedAtom<Value, Args, Result>;

export interface AtomStore {
    get: Getter;
    set: Setter;
    subscribe: (listener: () => void) => () => void;
}

const isPrimitiveAtom = <Value,>(atomConfig: Atom<Value>): atomConfig is PrimitiveAtom<Value> => {
    return atomConfig.kind === 'primitive';
};

const isWritableDerivedAtom = <Value, Args extends unknown[], Result>(
    atomConfig: WritableAtom<Value, Args, Result>
): atomConfig is WritableDerivedAtom<Value, Args, Result> => {
    return atomConfig.kind === 'writable-derived';
};

export const createAtomStore = (): AtomStore => {
    const atomState = new Map<symbol, unknown>();
    const listeners = new Set<() => void>();

    const notify = () => {
        listeners.forEach((listener) => listener());
    };

    const get: Getter = <Value,>(atomConfig: Atom<Value>) => {
        if (isPrimitiveAtom(atomConfig)) {
            if (!atomState.has(atomConfig.key)) {
                atomState.set(atomConfig.key, atomConfig.init);
            }
            return atomState.get(atomConfig.key) as Value;
        }

        return atomConfig.read(get);
    };

    const set: Setter = <Value, Args extends unknown[], Result>(
        atomConfig: WritableAtom<Value, Args, Result>,
        ...args: Args
    ) => {
        if (isPrimitiveAtom(atomConfig)) {
            const update = args[0] as SetStateAction<Value>;
            const previousValue = get(atomConfig);
            const nextValue = typeof update === 'function'
                ? (update as (previousValue: Value) => Value)(previousValue)
                : update;

            if (Object.is(previousValue, nextValue)) {
                return undefined as Result;
            }

            atomState.set(atomConfig.key, nextValue);
            notify();
            return undefined as Result;
        }

        if (!isWritableDerivedAtom(atomConfig)) {
            throw new Error('Attempted to write to a read-only atom.');
        }

        return atomConfig.write(get, set, ...args);
    };

    return {
        get,
        set,
        subscribe: (listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
    };
};

const defaultStore = createAtomStore();
const AtomStoreContext = createContext<AtomStore | null>(null);

interface AtomProviderProps {
    children: React.ReactNode;
    store?: AtomStore;
}

export const AtomProvider = ({ children, store }: AtomProviderProps) => {
    const storeRef = useRef<AtomStore | null>(store ?? null);

    if (storeRef.current === null) {
        storeRef.current = createAtomStore();
    }

    return React.createElement(
        AtomStoreContext.Provider,
        { value: storeRef.current },
        children
    );
};

export function atom<Value>(initialValue: Value): PrimitiveAtom<Value>;
export function atom<Value>(read: Read<Value>): DerivedAtom<Value>;
export function atom<Value, Args extends unknown[], Result>(read: Read<Value>, write: Write<Value, Args, Result>): WritableDerivedAtom<Value, Args, Result>;
export function atom<Value, Args extends unknown[], Result>(
    readOrInitialValue: Value | Read<Value>,
    write?: Write<Value, Args, Result>
): PrimitiveAtom<Value> | DerivedAtom<Value> | WritableDerivedAtom<Value, Args, Result> {
    if (typeof readOrInitialValue === 'function') {
        if (write) {
            return {
                key: Symbol('atom'),
                kind: 'writable-derived',
                read: readOrInitialValue as Read<Value>,
                write,
            };
        }

        return {
            key: Symbol('atom'),
            kind: 'derived',
            read: readOrInitialValue as Read<Value>,
        };
    }

    const primitiveAtom: PrimitiveAtom<Value> = {
        key: Symbol('atom'),
        kind: 'primitive',
        init: readOrInitialValue as Value,
        read: () => readOrInitialValue as Value,
    };

    return primitiveAtom;
}

const useAtomStore = () => {
    return useContext(AtomStoreContext) ?? defaultStore;
};

export function useAtomValue<Value>(atomConfig: Atom<Value>) {
    const store = useAtomStore();

    return useSyncExternalStore(
        store.subscribe,
        () => store.get(atomConfig),
        () => store.get(atomConfig)
    );
}

export function useSetAtom<Value>(atomConfig: PrimitiveAtom<Value>): (update: SetStateAction<Value>) => void;
export function useSetAtom<Value, Args extends unknown[], Result>(atomConfig: WritableDerivedAtom<Value, Args, Result>): (...args: Args) => Result;
export function useSetAtom<Value, Args extends unknown[], Result>(atomConfig: WritableAtom<Value, Args, Result>) {
    const store = useAtomStore();

    return useCallback((...args: Args) => {
        return store.set(atomConfig, ...args);
    }, [atomConfig, store]);
}

export function useAtom<Value>(atomConfig: PrimitiveAtom<Value>): [Value, (update: SetStateAction<Value>) => void];
export function useAtom<Value>(atomConfig: DerivedAtom<Value>): [Value, never];
export function useAtom<Value, Args extends unknown[], Result>(atomConfig: WritableDerivedAtom<Value, Args, Result>): [Value, (...args: Args) => Result];
export function useAtom<Value, Args extends unknown[], Result>(atomConfig: Atom<Value> | WritableAtom<Value, Args, Result>) {
    const value = useAtomValue(atomConfig as Atom<Value>);
    const store = useAtomStore();

    const setValue = useCallback((...args: Args) => {
        return store.set(atomConfig as WritableAtom<Value, Args, Result>, ...args);
    }, [atomConfig, store]);

    if ((atomConfig as Atom<Value>).kind === 'derived') {
        return [value, undefined as never] as const;
    }

    return [value, setValue] as const;
}
