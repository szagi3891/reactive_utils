import { EventEmitter } from "./EventEmitter.ts";

export type AbortBoxFn = (callback: () => void) => (() => void);

export class AbortBox {
    private emmit: EventEmitter<void> | null;

    constructor() {
        this.emmit = new EventEmitter();
    }

    onAbort = (callback: () => void): (() => void) => {

        if (this.emmit === null) {
            callback();
            return () => {};
        }

        const unsubscribe = this.emmit.on(callback);
        return () => {
            unsubscribe();
        };
    }

    abort() {
        if (this.emmit === null) {
            return;
        }

        const emmit = this.emmit;
        this.emmit = null;
        emmit.trigger();
    }
}