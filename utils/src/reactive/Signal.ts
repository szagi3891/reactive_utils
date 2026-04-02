
import { createAtom } from "mobx";
import type { IAtom } from "mobx";
import { assertNever } from "../assertNever.ts";
import { ConnectType, createConnectAtom, UnsubscrbeType } from "./createConnectAtom.ts";

export class SignalSource<T> {
    public readonly atom: IAtom;

    public constructor(private readonly options: {
        set: (value: T) => void,
        get: () => T,
    }) {
        this.atom = createAtom('signalSource');
    }

    public set(value: T): void {
        this.options.set(value);
        this.atom.reportChanged();
    }

    public get(): T {
        this.atom.reportObserved();
        return this.options.get();
    }

    public isObserved(): boolean {
        return this.atom.isBeingObserved;
    }
}

export class Signal<T> {
    // private readonly valueUnsafe: ValueUnsafe<T>;
    private readonly atom: IAtom;
    private value: T;

    public constructor(value: NoInfer<T>, onConnect?: ConnectType) {
        this.atom = createConnectAtom('signal', onConnect);
        this.value = value;
    }

    public set(value: T): void {
        this.value = value;
        this.atom.reportChanged();
    }

    public get(): T {
        this.atom.reportObserved();
        return this.value;
    }

    public isObserved(): boolean {
        return this.atom.isBeingObserved;
    }

    public static withKeepAlive<T>(timeMs: number, value: T, onConnect: ConnectType): Signal<T> {
        let state: {
            type: 'off',
        } | {
            type: 'on',
            unsubscribe: UnsubscrbeType,
        } | {
            type: 'on->off',
            unsubscribe: UnsubscrbeType,
            timer: ReturnType<typeof setTimeout>,
        } = {
            type: 'off',
        };

        return new Signal(value, (): (() => void) => {
        
            if (state.type === 'off') {
                state = {
                    type: 'on',
                    unsubscribe: onConnect()
                };
            } else if (state.type === 'on') {
                throw Error('withKeepAlive -> connect -> Incorrect state - on');
            } else if (state.type === 'on->off') {
                clearTimeout(state.timer);

                state = {
                    type: 'on',
                    unsubscribe: state.unsubscribe,
                };
            } else {
                assertNever(state);
            }

            return () => {
                if (state.type === 'off') {
                    throw Error('withKeepAlive -> disconnect -> Incorrect state - off');
                } else if (state.type === 'on->off') {
                    throw Error('withKeepAlive -> disconnect -> Incorrect state - on->off');
                } else if (state.type === 'on') {
                    const unsubscribe = state.unsubscribe;

                    const timer = setTimeout(() => {
                        unsubscribe();
                        state = {
                            type: 'off',
                        };
                    }, timeMs);

                    state = {
                        type: 'on->off',
                        unsubscribe,
                        timer
                    }
                } else {
                    assertNever(state);
                }
            };
        });
    }
}

