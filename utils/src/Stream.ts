import { EventEmitter } from "./EventEmitter.ts";

export class Stream<T> {
    /**
     * Native ReadableStream for consumption (read-only access).
     */
    public readonly readableStream: ReadableStream<T>;
    private readonly controller: ReadableStreamDefaultController<T>;
    private readonly whenClose: EventEmitter<void>;
    private open: boolean = true;

    constructor(highWaterMark?: number) {
        const whenClose = new EventEmitter<void>();

        let controller: ReadableStreamDefaultController<T> | null = null;

        const strategy = highWaterMark !== undefined 
            ? new CountQueuingStrategy({ highWaterMark }) 
            : undefined;

        const stream = new ReadableStream<T>({
            start(c) {
                controller = c;
            },
            cancel: () => {
                this.open = false;
                whenClose.trigger();
            }
        }, strategy);

        if (controller === null) {
            throw Error('Controller expected');
        }

        this.readableStream = stream;
        this.controller = controller;
        this.whenClose = whenClose;
    }

    public get readable(): AsyncIterable<T> {
        return this.readableStream;
    }


    public onAbort = (callback: () => void): (() => void) => {
        if (!this.open) {
            callback();
            return () => {};
        }

        return this.whenClose.on(callback);
    }

    public isOpen(): boolean {
        return this.open;
    }

    public push(value: T) {
        if (!this.open) {
           console.warn('Stream is closed');
           return; 
        }

        try {
            this.controller.enqueue(value);
        } catch (e) {
            console.warn('Stream enqueue error', e);
        }
    }

    public close() {
        if (!this.open) return;
        this.open = false;
        try {
            this.controller.close();
        } catch (_e) {
            // ignore
        }
        this.whenClose.trigger();
    }

    // public error(reason?: unknown) {
    //     this.controller.error(reason);
    // }

    public get desiredSize(): number | null {
        return this.controller.desiredSize;
    }

}
