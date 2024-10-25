import { createAtom } from "mobx";
import type { IAtom } from "mobx";

export type UnsubscrbeType = () => void;
export type ConnectType<T> = (setValue: (newValue: T) => void) => UnsubscrbeType;

export class ValueUnsafe<T> {

    public value: T;
    public readonly atom: IAtom;
    private unsubscribe: null | UnsubscrbeType;

    public constructor(value: NoInfer<T>, onConnect?: ConnectType<T>) {
        this.value = value;
        this.unsubscribe = null;

        if (onConnect === undefined) {
            this.atom = createAtom('value');
            return;
        }

        this.atom = createAtom('valueConnect', () => {

            if (this.unsubscribe === null) {
                this.unsubscribe = onConnect((newValue) => {
                    this.value = newValue;
                    this.atom.reportChanged();
                });
            } else {
                console.error('Expected null');
            }
        }, () => {

            if (this.unsubscribe === null) {
                console.error('Expected subscription ');
            } else {
                this.unsubscribe();
                this.unsubscribe = null;
            }
        });
    }
}
