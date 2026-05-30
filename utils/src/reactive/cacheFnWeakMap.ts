
export const cacheFnWeakMap = <K extends { getTarget: () => Target }, Target, R>(
    fn: (target: Target) => R
): ((target: K) => R) => {
    const cache = new WeakMap<K, R>();

    return (target: K): R => {
        const value = cache.get(target);

        if (value !== undefined) {
            return value;
        }

        const newValue = fn(target.getTarget());

        cache.set(target, newValue);

        return newValue;
    };
};
