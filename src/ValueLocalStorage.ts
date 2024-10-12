import z from 'zod';
import { Value } from './Value';
import { autorun } from 'mobx';

type UnsubscrbeType = () => void;
type ConnectType<T> = (setValue: (newValue: T) => void) => UnsubscrbeType;

const isServer = () => typeof window === 'undefined';

const getInitValue = <T>(localStorageKey: string, value: T, decoder: z.ZodType<T>): T => {
    if (isServer()) {
        return value;
    }

    const valueLocalStorage = localStorage.getItem(localStorageKey);

    if (valueLocalStorage === null) {
        return value;
    }

    try {
        const valueJson = JSON.parse(valueLocalStorage);

        const valueSafe = decoder.safeParse(valueJson);

        if (valueSafe.success) {
            return valueSafe.data;
        }
    } catch (error) {
        console.warn(`Ignore value from localStorage key=${localStorageKey}`);
    }

    return value;
};

export class ValueLocalStorage<T> {
    private readonly value: Value<T>;

    constructor(localStorageKey: string, value: T, decoder: z.ZodType<T>, onConnect?: ConnectType<T>) {
        
        const initValue = getInitValue(localStorageKey, value, decoder);

        this.value = new Value(initValue, onConnect);

        if (!isServer()) {
            autorun(() => {
                const serialized = JSON.stringify(this.value.getValue());
                localStorage.setItem(localStorageKey, serialized);
            });
        }
    }

    public setValue(value: T) {
        this.value.setValue(value);
    }

    public getValue(): T {
        return this.value.getValue();
    }
}