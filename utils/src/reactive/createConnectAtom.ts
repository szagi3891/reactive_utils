import { createAtom, IAtom } from "mobx";

export type UnsubscrbeType = () => void;
export type ConnectType = () => UnsubscrbeType;


const createConnectAtomFn = (name: string, onConnect: ConnectType): IAtom => {
    let unsubscribe: null | UnsubscrbeType = null;

    const atom = createAtom(name, () => {

        if (unsubscribe === null) {
            unsubscribe = onConnect();
        } else {
            console.error('Expected null');
        }
    }, () => {

        if (unsubscribe === null) {
            console.error('Expected subscription ');
        } else {
            unsubscribe();
            unsubscribe = null;
        }
    });
    return atom;
}

export const createConnectAtom = (name: string, onConnect?: ConnectType): IAtom => {
    return onConnect === undefined
        ? createAtom(name)
        : createConnectAtomFn(name, onConnect);
};
