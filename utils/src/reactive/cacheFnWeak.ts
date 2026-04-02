import { whenDrop } from "@reactive/utils";
import { stringifyValue } from "./stringifyValue.ts";

export const cacheFnWeak = <P extends Array<unknown>, R extends WeakKey>(fn: (...params: P) => R): ((...params: P) => R) => {
    const data: Map<string, WeakRef<R>> = new Map();

    return (...params: P): R => {
        const key = stringifyValue(params);

        const valueRef = data.get(key);

        if (valueRef !== undefined) {
            const value = valueRef.deref();

            if (value !== undefined) {
                return value;
            }
        }

        const newValue = fn(...params);

        whenDrop(newValue, () => {
            const value = data.get(key)?.deref();
            if (value === undefined) {
                data.delete(key);
            }
        });

        data.set(key, new WeakRef(newValue));

        return newValue;
    };
};
