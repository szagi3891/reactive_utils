import { whenDrop } from './whenDrop.ts';
import { stringifyValue } from "./stringifyValue.ts";

// class WeakMap<R extends WeakKey> {
//     private data: Map<string, WeakRef<R>> = new Map();

//     get(key: string): R | undefined {
//         const valueRef = this.data.get(key);

//         if (valueRef !== undefined) {
//             const value = valueRef.deref();

//             if (value !== undefined) {
//                 return value;
//             }
//         }
//     }
    
//     set(key: string, newValue: R): void {
//         this.data.set(key, new WeakRef(newValue));
//     }

//     clearIfEmpty(key: string): void {
//         if (this.data.get(key)?.deref() === undefined) {
//             this.data.delete(key);
//         }
//     }
// }

//TODO - add tests for cacheFeWeak

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

export const cacheFnWeakOptional = <P extends Array<unknown>, R extends WeakKey>(fn: (...params: P) => R | null): ((...params: P) => R | null) => {
    const data: Map<string, WeakRef<R>> = new Map();

    return (...params: P): R | null => {
        const key = stringifyValue(params);

        const valueRef = data.get(key);

        if (valueRef !== undefined) {
            const value = valueRef.deref();

            if (value !== undefined) {
                return value;
            }
        }

        const newValue = fn(...params);

        if (newValue === null) {
            return null;
        }

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
