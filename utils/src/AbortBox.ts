import { EventEmitter } from "./EventEmitter.ts";

export type AbortBoxFn = (callback: () => void) => (() => void);

export class AbortBox {
    private emmit: EventEmitter<void> | null;

    constructor() {
        this.emmit = new EventEmitter();
    }

    public isAborted = (): boolean => this.emmit === null;

    public isActive = (): boolean => this.emmit !== null;

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