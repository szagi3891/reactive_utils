import { assertNever } from "../../assertNever.ts";
import { ConnectType, UnsubscrbeType } from "../createConnectAtom.ts";


export const withKeepAlive = (timeMs: number, onConnect: ConnectType): ConnectType => {
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

    return () => {
    
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
    };
};


