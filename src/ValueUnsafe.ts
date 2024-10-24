import { createAtom } from "mobx";
import type { IAtom } from "mobx";

export type UnsubscrbeType = () => void;
export type ConnectType<T> = (setValue: (newValue: T) => void) => UnsubscrbeType;

export class ValueUnsafe<T> {

    public value: T;
    public isObservedFlag: boolean;
    public readonly atom: IAtom;
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
}
