
export type EventEmitterReceiver<T> = (callback: (param: T) => void) => (() => void);

export class EventEmitter<T> {
    private events: Set<(param: T) => void>;

    constructor(private readonly onChange?: (size: number) => void) {
        this.events = new Set();
    }

    public on: EventEmitterReceiver<T> = (callback: (param: T) => void): (() => void) => {
        let isActive = true;

        const onExec = (param: T): void => {
            if (isActive) {
                callback(param);
            }
        };

        this.events.add(onExec);

        if (this.onChange !== undefined) {
            this.onChange(this.events.size);
        }

        return (): void => {
            isActive = false;
            this.events.delete(onExec);

            if (this.onChange !== undefined) {
                this.onChange(this.events.size);
            }    
        };
    }

    public trigger = (param: T): void => {
        const eventsCopy = Array.from(this.events.values());

        for (const itemCallbackToRun of eventsCopy) {
            try {
                itemCallbackToRun(param);
            } catch (err) {
                console.error(err);
            }
        }
    }
}

export class ValueEmitter<T> {
    private value: T;
    private emmiter: EventEmitter<T>;

    public constructor(value: T) {
        this.value = value;
        this.emmiter = new EventEmitter();
    }

    public on = (callback: (param: T) => void): (() => void) => {
        const unregister = this.emmiter.on(callback);
        callback(this.value);
        return unregister;
    }

    public set(param: T): void {
        this.value = param;
        this.emmiter.trigger(param);
    }

    public getCurrent(): T {
        return this.value;
    }
}

