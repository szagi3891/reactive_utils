import { Result } from "./Result.ts";
import { Stream } from "./Stream.ts";

/**
 * @deprecated Use Stream instead
 */
export class AsyncQueryIterator<T> implements AsyncIterable<T> {
    constructor(private readonly getNext: () => Promise<Result<T, null>>) {}

    public [Symbol.asyncIterator](): AsyncIterator<T, void, void> {
        return {
            next: async (): Promise<IteratorResult<T>> => {
                const value = await this.getNext();
                
                if (value.type === 'error') {
                    return {
                        value: undefined,
                        done: true,
                    };
                }

                return {
                    value: value.data,
                    done: false,
                };
            }
        };
    }
}

/**
 * @deprecated Use Stream instead
 */
export class AsyncQuery<T> {
    private readonly stream: Stream<T>;
    private readonly reader: ReadableStreamDefaultReader<T>;
    private readonly controller: AbortController;
    private _isOpen: boolean = true;

    constructor(controller?: AbortController) {
        this.stream = new Stream<T>();
        this.reader = this.stream.readable.getReader();

        if (controller) {
            this.controller = controller;
            this.controller.signal.addEventListener('abort', () => {
                this.close();
            });
        } else {
            this.controller = new AbortController();
        }
    }

    [Symbol.dispose]() {
        this.close();
    }

    public onAbort = (callback: () => void): (() => void) => {
        const signal = this.controller.signal;
        if (signal.aborted) {
            callback();
            return () => {};
        }

        signal.addEventListener('abort', callback, { once: true });
        return () => {
            signal.removeEventListener('abort', callback);
        };
    }

    public isClose(): boolean {
        return !this._isOpen;
    }

    public isOpen(): boolean {
        return this._isOpen;
    }

    public push(value: T): void {
        if (!this._isOpen) {
            console.warn('AsyncQuery is closed');
            return;
        }

        try {
            this.stream.push(value);
        } catch (_e) {
            // ignore if stream closed/errored
        }
    }

    public close(): void {
        if (!this._isOpen) return;
        
        this._isOpen = false;
        this.stream.close();
        this.controller.abort();
    }

    public subscribe(): AsyncIterable<T> {
        return new AsyncQueryIterator(this.get);
    }

    public get = async (): Promise<Result<T, null>> => {
        try {
            const { value, done } = await this.reader.read();
            
            if (done) {
                return Result.error(null);
            }
            
            return Result.ok(value);
        } catch (_e) {
            return Result.error(null);
        }
    }
}


