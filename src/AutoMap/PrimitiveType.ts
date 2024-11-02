import type { JSONValue } from "../Json.ts";

export const autoMapKeyAsString = Symbol('autoMapKeyAsString');

let nextId: number = 1;
const refs: WeakMap<WeakKey, number> = new WeakMap();

const getNextId = (value: WeakKey): number => {
    const idCache = refs.get(value);

    if (idCache !== undefined) {
        return idCache;
    }

    const newId = nextId;
    nextId += 1;

    refs.set(value, newId);

    return newId;
};

export class PrimitiveTypeId<T extends WeakKey> {

    private constructor(
        public readonly value: T,
        private readonly id: number,
    ) {
    }

    public static get<T extends WeakKey>(value: T): PrimitiveTypeId<T> {
        const id = getNextId(value);
        return new PrimitiveTypeId(value, id);
    }

    [autoMapKeyAsString](): number {
        return this.id;
    }
}


export type PrimitiveType = JSONValue | { [autoMapKeyAsString]: () => string | number };

export const reduceComplexSymbol = (value: PrimitiveType): JSONValue => {
    if (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    ) {
        return value;
    }

    if (autoMapKeyAsString in value) {
        console.info('konwersja do stringa');
        return value[autoMapKeyAsString]();
    }
    
    return value;
};
