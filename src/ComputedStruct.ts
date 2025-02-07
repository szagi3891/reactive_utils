import { computed, comparer, type IComputedValue } from "mobx";

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

export class ComputedStruct<T> {

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

    static initStructural<T>(value: () => T): ComputedStruct<T> {
        return new ComputedStruct(value, comparer.structural);
    }

    static initArrays<P, K extends Array<P> | null>(value: () => K): ComputedStruct<K> {
        return new ComputedStruct(value, (a: K, b: K) => {
            if (a === null || b === null) {
                return a === b;
            }

            return compareArray(a, b);
        });
    }

    getValue(): T {
        return this.computedValue.get();
    }
}