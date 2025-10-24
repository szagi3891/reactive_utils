import { cacheFnWeak } from "./cacheFnWeak.ts";
import { stringifyValue } from "./stringifyValue.ts";


export const cacheFnNeverRelease = <P extends Array<unknown>, R extends WeakKey>(fn: (...params: P) => R): ((...params: P) => R) => {
    const data: Map<string, R> = new Map();

    return (...params: P): R => {
        const key = stringifyValue(params);
        const value = data.get(key);

        if (value !== undefined) {
            return value;
        }

        const newValue = fn(...params);
        data.set(key, newValue);
        return newValue;
    };
};



export const cacheFnStrong = <P extends Array<unknown>, R extends WeakKey>(fn: (...params: P) => R): ((...params: P) => R) => {
    if (typeof window === 'undefined') {
        return cacheFnWeak(fn);
    }

    return cacheFnNeverRelease(fn);
};


