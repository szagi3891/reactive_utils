import { AutoMap } from "./AutoMap.ts";
import { type PrimitiveJSONValue } from "./PrimitiveType.ts";


const autoWeakRefSymbol = Symbol();


export class AutoWeakRef {
    private inner: typeof autoWeakRefSymbol = autoWeakRefSymbol;

    constructor() {
        this.inner
    }
}


class AutoWeakInner {
    protected nominal?: never;
}


const translate: WeakMap<AutoWeakRef, AutoWeakInner> = new WeakMap();

const getRef = (autoWeakRef: AutoWeakRef): AutoWeakInner | null => {
    return translate.get(autoWeakRef) ?? null;
};

export const register = (autoWeakRef: AutoWeakRef): void => {
    const ref = getRef(autoWeakRef);
    if (ref !== null) {
        throw Error('This object was already registered');
    }

    const newRef = new AutoWeakInner();
    translate.set(autoWeakRef, newRef);
};

export const unregister = (autoWeakRef: AutoWeakRef): void => {
    const ref = getRef(autoWeakRef);
    if (ref === null) {
        throw Error('this object was not registered');
    }

    translate.delete(autoWeakRef);
};

const getRefValue = (autoWeakRef: AutoWeakRef): AutoWeakInner => {
    const ref = getRef(autoWeakRef);
    if (ref === null) {
        throw Error('this object is not registered');
    }
    return ref;
};

export const autoWeakMapKey = Symbol('AutoWeakMapKey');

export class AutoWeakMap {

    public static create = <C extends { [autoWeakMapKey]: () => AutoWeakRef }, K extends PrimitiveJSONValue[], V>(
        createValue: (...key: [C, ...K]) => V
    ): ((...key: [C, ...K]) => V) => {

        const week = new WeakMap<AutoWeakInner, AutoMap<K, V>>();

        return (...key: [C, ...K]): V => {
            const [context, ...rest] = key;

            const autoMap = week.get(getRefValue(context[autoWeakMapKey]()));

            if (autoMap !== undefined) {
                return autoMap.get(rest);
            }

            const newAuto = new AutoMap<K, V>((key) => {
                return createValue(context, ...key);
            });
            week.set(getRefValue(context[autoWeakMapKey]()), newAuto);
            return newAuto.get(rest);
        };
    };

}
