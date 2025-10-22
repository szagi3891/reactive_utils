import { Signal } from "./reactive/Signal.ts";

export class ValueDeferred<T> {

    private value: T;
    private readonly valueDeferred: Signal<T>;

    public constructor(initValue: T, timeIntervalMs: number) {
        this.value = initValue;

        this.valueDeferred = new Signal(initValue, (setValue) => {

            setValue(this.value);

            const timer = setInterval(() => {
                setValue(this.value);
            }, timeIntervalMs);

            return () => {
                clearInterval(timer);
            };
        });
    }

    public set(newValue: T) {
        this.value = newValue;
    }

    public get(): T {
        return this.value;
    }

    public observe(): T {
        return this.valueDeferred.getValue();
    }
}
