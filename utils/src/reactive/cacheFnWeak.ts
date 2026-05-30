import { whenDrop } from './whenDrop.ts';
import { stringifyValue } from "./stringifyValue.ts";
import { Result } from "../Result.ts";

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

export const cacheFnWeakOptional = <P extends Array<unknown>, R extends WeakKey | null>(fn: (...params: P) => R | null): ((...params: P) => R | null) => {
    const innerCache = cacheFnWeak((...params: P): Result<R, null> => {
        const result = fn(...params);
        if (result === null) {
            return Result.error(null);
        }
        return Result.ok(result);
    });

    return (...params: P): R | null => {
        const result = innerCache(...params);
        if (result.type === 'ok') {
            return result.data;
        }
        return null;
    };
};
