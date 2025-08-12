export const getValueCache = <T extends NonNullable<unknown>>(getValue: () => Promise<T>): (() => Promise<T>) => {
    let init: T | null = null;

    return async (): Promise<T> => {
        if (init !== null) {
            return init;
        }

        const value = await getValue();
        init = value;
        return value;
    };
};
