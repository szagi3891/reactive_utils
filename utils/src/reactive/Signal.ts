
import { assertNever } from "../assertNever.ts";
import { ValueUnsafe, type ConnectType, type UnsubscrbeType } from "../ValueUnsafe.ts";

export class Signal<T> {
    private readonly valueUnsafe: ValueUnsafe<T>;

    public constructor(value: NoInfer<T>, onConnect?: ConnectType<T>) {
        this.valueUnsafe = new ValueUnsafe(value, onConnect);
    }

    public set(value: T): void {
        this.valueUnsafe.value = value;
        this.valueUnsafe.atom.reportChanged();
    }

    public get(): T {
        this.valueUnsafe.atom.reportObserved();
        return this.valueUnsafe.value;
    }

    /**
     * @deprecated - please use "set" instead of
     * @returns 
     */
    setValue(value: T): void {
        return this.set(value);
    }

    /**
     * @deprecated - please use "get" instead of
     * @returns 
     */
    getValue(): T {
        return this.get();
    }

    public isObserved(): boolean {
        return this.valueUnsafe.atom.isBeingObserved;
    }

    public static withKeepAlive<T>(timeMs: number, value: T, onConnect: ConnectType<T>): Signal<T> {
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

        return new Signal(value, (setValue: (value: T) => void): (() => void) => {
        
            if (state.type === 'off') {
                state = {
                    type: 'on',
                    unsubscribe: onConnect(setValue)
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

