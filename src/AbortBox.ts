import { EventEmitter } from "./EventEmitter.ts";

export type AbortBoxFn = (callback: () => void) => (() => void);

export class AbortBox {
    private abortFlag: boolean = false;
    private emmit: EventEmitter<void>;

    constructor() {
        this.emmit = new EventEmitter();
    }

    onAbort = (callback: () => void): (() => void) => {

        if (this.abortFlag) {
            callback();
            return () => {};
        }

        const unsubscribe = this.emmit.on(callback);
        return () => {
            unsubscribe();
        };
    }

    abort() {
        if (this.abortFlag) {
            return;
        }
        this.abortFlag = true;
        this.emmit.trigger();
    }
}