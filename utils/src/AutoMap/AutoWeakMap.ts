import { AutoMap } from "./AutoMap.ts";
import { type PrimitiveJSONValue } from "./PrimitiveType.ts";

class CommonRef {
    protected nominal?: never;
}

const translate: WeakMap<WeakKey, CommonRef> = new WeakMap();

const getRef = (common: WeakKey): CommonRef | null => {
    return translate.get(common) ?? null;
};

const register = (common: WeakKey): void => {
    const ref = getRef(common);
    if (ref !== null) {
        throw Error('This object was already registered');
    }

    const newRef = new CommonRef();
    translate.set(common, newRef);
};

const unregister = (common: WeakKey): void => {
    const ref = getRef(common);
    if (ref === null) {
        throw Error('this object was not registered');
    }

    translate.delete(common);
};

const getRefValue = (common: WeakKey): CommonRef => {
    const ref = getRef(common);
    if (ref === null) {
        throw Error('this object is not registered');
    }
    return ref;
};

export const autoWeakMapKey = Symbol('AutoWeakMapKey');

export class AutoWeakMap {

    public static register = register;
    public static unregister = unregister;

    public static create = <C extends { [autoWeakMapKey]: () => void }, K extends PrimitiveJSONValue[], V>(
        createValue: (...key: [C, ...K]) => V
    ): ((...key: [C, ...K]) => V) => {

        const week = new WeakMap<CommonRef, AutoMap<K, V>>();

        return (...key: [C, ...K]): V => {
            const [context, ...rest] = key;

            const autoMap = week.get(getRefValue(context));

            if (autoMap !== undefined) {
                return autoMap.get(rest);
            }

            const newAuto = new AutoMap<K, V>((key) => {
                return createValue(context, ...key);
            });
            week.set(getRefValue(context), newAuto);
            return newAuto.get(rest);
        };
    };

}
