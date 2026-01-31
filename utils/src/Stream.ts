import { EventEmitter, EventEmitterReceiver } from "./EventEmitter.ts";

export class Stream<T> {
    /**
     * Native ReadableStream for consumption (read-only access).
     */
    public readonly readable: ReadableStream<T>;
    private readonly controller: ReadableStreamDefaultController<T>;
    private readonly whenClose: EventEmitter<void>;
    public readonly onWhenClose: EventEmitterReceiver<void>;

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
            cancel() {
                whenClose.trigger();
            }
        }, strategy);

        if (controller === null) {
            throw Error('Controller expected');
        }

        this.readable = stream;
        this.controller = controller;
        this.whenClose = whenClose;

        this.onWhenClose = this.whenClose.on;
    }

    public push(value: T) {
        this.controller.enqueue(value);
    }

    public close() {
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
