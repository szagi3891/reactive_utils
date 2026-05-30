
export const cacheFnWeakMap = <K extends WeakKey, R>(fn: (target: K) => R): ((target: K) => R) => {
    const cache = new WeakMap<K, R>();

    return (target: K): R => {
        const value = cache.get(target);

        if (value !== undefined) {
            return value;
        }

        const newValue = fn(target);

        cache.set(target, newValue);

        return newValue;
    };
};
