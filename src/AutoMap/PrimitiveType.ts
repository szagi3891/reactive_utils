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

export class PrimitiveTypeId {

    private constructor(
        private readonly value: number,
    ) {
    }

    public static get(value: WeakKey): PrimitiveTypeId {
        const id = getNextId(value);
        return new PrimitiveTypeId(id);
    }

    [autoMapKeyAsString](): number {
        return this.value;
    }
}




type PrimitiveBaseType = string | number | boolean | null | undefined | PrimitiveBaseType[];

export type PrimitiveType = PrimitiveBaseType | { [autoMapKeyAsString]: () => string | number } | PrimitiveType[];

const reduceSymbol = (value: PrimitiveType): PrimitiveBaseType => {
    if (
        value === null ||
        value === undefined ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    ) {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map(reduceSymbol);
    }

    return value[autoMapKeyAsString]();
};

export const reduceComplexSymbol = (value: PrimitiveType[] | PrimitiveType): PrimitiveBaseType[] | PrimitiveBaseType => {
    if (Array.isArray(value)) {
        return value.map(reduceSymbol);
    }

    return reduceSymbol(value);
};
