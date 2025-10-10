import { Value } from "@reactive/utils";

export class ValueDeferred<T> {

    private value: T;
    private readonly valueDeferred: Value<T>;

    public constructor(initValue: T, timeIntervalMs: number) {
        this.value = initValue;

        this.valueDeferred = new Value(initValue, (setValue) => {

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
