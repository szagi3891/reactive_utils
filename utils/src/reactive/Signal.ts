import type { IAtom } from "mobx";
import { assertNever } from "../assertNever.ts";
import { ConnectType, createConnectAtom, UnsubscrbeType } from "./createConnectAtom.ts";

/** Shared contract for {@link Signal} — use for parameters that accept any signal instance. */
export type SignalBase<T> = {
    readonly atom: IAtom;
    get(): T;
    set(value: T): void;
    isObserved(): boolean;
};

export class Signal<T> implements SignalBase<T> {
    public readonly atom: IAtom;
    private readonly value: {
        value: T
    };

    private constructor(value: { value: NoInfer<T> }, onConnect?: ConnectType) {
        this.atom = createConnectAtom('signal', onConnect);
        this.value = value;
    }

    public static create<T>(value: NoInfer<T>, onConnect?: ConnectType): Signal<T> {
        return new Signal({ value }, onConnect);
    }

    public static createSource<T>(value: { value: T }, onConnect?: ConnectType): Signal<T> {
        return new Signal(value, onConnect);
    }

    public set(value: T): void {
        this.value.value = value;
        this.atom.reportChanged();
    }

    public get(): T {
        this.atom.reportObserved();
        return this.value.value;
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

        return new Signal({ value }, (): (() => void) => {
        
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
