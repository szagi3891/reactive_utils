import { computed, comparer, type IComputedValue } from "mobx";
import { Signal } from "./Signal.ts";

export const compareArray = <T>(list1: Array<T>, list2: Array<T>): boolean => {
    if (list1.length !== list2.length) {
        return false;
    }

    for (let index = 0; index < list1.length; index++) {
        if (list1[index] !== list2[index]) {
            return false;
        }
    }
    return true;
};

export class Computed<T> {

    private readonly computedValue: IComputedValue<T>;

    private constructor(
        value: () => T,
        equals: (a: T, b: T) => boolean
    ) {
        this.computedValue = computed(() => {
            return value();
        }, {
            equals,
        });
    }

    //https://mobx.js.org/computeds.html#built-in-comparers

    static initIdentity<T>(value: () => T): Computed<T> {
        return new Computed(value, comparer.identity);
    }

    static initShallow<T>(value: () => T): Computed<T> {
        return new Computed(value, comparer.shallow);
    }

    static initShallowArray<K extends Array<unknown> | null>(value: () => K): Computed<K> {
        return new Computed(value, (a: K, b: K) => {
            if (a === null || b === null) {
                return a === b;
            }

            return compareArray(a, b);
        });
    }

    static initStructural<T>(value: () => T): Computed<T> {
        return new Computed(value, comparer.structural);
    }

    public static withPollingSync<T>(
        pollIntervalMs: number,
        getSource: () => T,
    ): Computed<T> {
        const signal = Signal.create<T>(getSource(), () => {
            signal.set(getSource());

            const timer = setInterval(() => {
                const source = getSource();
                if (signal.get() !== source) {
                    signal.set(source);
                }
            }, pollIntervalMs);

            return () => {
                clearInterval(timer);
            };
        });

        return Computed.initIdentity(() => signal.get());
    }

        
    get(): T {
        return this.computedValue.get();
    }
}