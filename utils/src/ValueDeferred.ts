import { Signal } from "./reactive/Signal.ts";

export class ValueDeferred<T> {

    private value: T;
    private readonly valueDeferred: Signal<T>;

    public constructor(initValue: T, timeIntervalMs: number) {
        this.value = initValue;

        const valueDeferred = Signal.create<T>(initValue, () => {

            valueDeferred.set(this.value);

            const timer = setInterval(() => {
                const current = valueDeferred.get();

                if (current !== this.value) {
                    valueDeferred.set(this.value)
                }
            }, timeIntervalMs);

            return () => {
                clearInterval(timer);
            };
        });

        this.valueDeferred = valueDeferred;
    }

    public set(newValue: T) {
        this.value = newValue;
    }

    public getUnobserved(): T {
        return this.value;
    }

    public observe(): T {
        return this.valueDeferred.get();
    }
}
