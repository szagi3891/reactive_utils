import type { IAtom } from "mobx";
import { ConnectType, createConnectAtom } from "./createConnectAtom.ts";
import { withKeepAlive } from "./Signal/withKeepAlive.ts";

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
        const connect = withKeepAlive(timeMs, onConnect);
        return new Signal({ value }, connect);
    }


}
