
import { assertNever } from "./assertNever.ts";
import { ValueUnsafe, type ConnectType, type UnsubscrbeType } from "./ValueUnsafe.ts";

export class Value<T> {
    private readonly valueUnsafe: ValueUnsafe<T>;

    public constructor(value: NoInfer<T>, onConnect?: ConnectType<T>) {
        this.valueUnsafe = new ValueUnsafe(value, onConnect);
    }

    public setValue(value: T): void {
        this.valueUnsafe.value = value;
        this.valueUnsafe.atom.reportChanged();
    }

    public getValue(): T {
        this.valueUnsafe.atom.reportObserved();
        return this.valueUnsafe.value;
    }

    public isObserved(): boolean {
        return this.valueUnsafe.atom.isBeingObserved;
    }

    public static withKeepAlive<T>(timeMs: number, value: T, onConnect: ConnectType<T>): Value<T> {
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

        return new Value(value, (setValue: (value: T) => void): (() => void) => {
        
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

