import { createAtom, IAtom } from "mobx";
import { assertNever } from "./assertNever";

type UnsubscrbeType = () => void;
type ConnectType<T> = (setValue: (newValue: T) => void) => UnsubscrbeType;

export class Value<T> {
    private value: T;
    private isObservedFlag: boolean;
    private readonly atom: IAtom;
    private unsubscribe: null | UnsubscrbeType;

    public constructor(value: NoInfer<T>, onConnect?: ConnectType<T>) {
        this.value = value;
        this.isObservedFlag = false;
        this.unsubscribe = null;

        if (onConnect === undefined) {
            this.atom = createAtom('value', () => {
                this.isObservedFlag = true;
            }, () => {
                this.isObservedFlag = false;
            });
        } else {
            this.atom = createAtom('valueConnect', () => {
                this.isObservedFlag = true;

                if (this.unsubscribe === null) {
                    this.unsubscribe = onConnect((newValue) => {
                        this.value = newValue;
                        this.atom.reportChanged();
                    });
                } else {
                    console.error('Expected null');
                }
            }, () => {
                this.isObservedFlag = false;

                if (this.unsubscribe === null) {
                    console.error('Expected subscription ');
                } else {
                    this.unsubscribe();
                    this.unsubscribe = null;
                }
            });
        }
    }

    public setValue(value: T): void {
        this.value = value;
        this.atom.reportChanged();
    }

    public getValue(): T {
        this.atom.reportObserved();
        return this.value;
    }

    public isObserved(): boolean {
        return this.isObservedFlag;
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
            timer: NodeJS.Timeout,
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
                assertNever('withKeepAlive -> connect -> assert', state);
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
                    }, timeMs);

                    state = {
                        type: 'on->off',
                        unsubscribe,
                        timer
                    }
                } else {
                    assertNever('withKeepAlive -> disconnect -> assert', state);
                }
            };
        });
    }
}