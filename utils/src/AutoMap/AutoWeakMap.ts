import { AutoMap } from "./AutoMap.ts";
import { AllocationCounter } from "./AllocationCounter.ts";
import { type PrimitiveJSONValue } from "./PrimitiveType.ts";


const counterAutoWeakRef = new AllocationCounter();
const counterWeakMap = new AllocationCounter();



const autoWeakRefSymbol = Symbol();


export class AutoWeakRef {
    private inner: typeof autoWeakRefSymbol = autoWeakRefSymbol;

    constructor() {
        console.info('AutoWeakRef constructor', this.inner);
        counterAutoWeakRef.up(this);
        register(this);
    }
}


class AutoWeakInner {
    protected nominal?: never;
}


let translate: Map<AutoWeakRef, AutoWeakInner> = new Map();

const getRef = (autoWeakRef: AutoWeakRef): AutoWeakInner | null => {
    return translate.get(autoWeakRef) ?? null;
};

const register = (autoWeakRef: AutoWeakRef): void => {
    const ref = getRef(autoWeakRef);
    if (ref !== null) {
        throw Error('AutoWeakMap register: This object was already registered');
    }

    const newRef = new AutoWeakInner();
    translate.set(autoWeakRef, newRef);
};

export const unregister = (autoWeakRef: AutoWeakRef): void => {
    const ref = getRef(autoWeakRef);
    if (ref === null) {
        throw Error('AutoWeakMap unregister: this object was not registered');
    }

    translate.delete(autoWeakRef);
};

export const resetAll = (): void => {
    const newTranslate = new Map();

    for (const key of translate.keys()) {
        newTranslate.set(key, new AutoWeakInner())
    }

    translate = newTranslate;
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

    public static resetAll = resetAll;

    public static create = <C extends { [autoWeakMapKey]: () => AutoWeakRef }, K extends PrimitiveJSONValue[], V>(
        createValue: (...key: [C, ...K]) => V
    ): ((...key: [C, ...K]) => V) => {

        const week = new WeakMap<AutoWeakInner, AutoMap<K, V>>();

        counterWeakMap.up(week);

        return (...key: [C, ...K]): V => {
            const [context, ...rest] = key;
            const weekKey = getRefValue(context[autoWeakMapKey]());
            // const weekContet: WeakRef<C> = new WeakRef(context);

            const autoMap = week.get(weekKey);

            if (autoMap !== undefined) {
                return autoMap.get(rest);
            }

            const newAuto = new AutoMap<K, V>((key) => {
                // const context = weekContet.deref();

                // if (context === undefined) {
                //     throw Error('context expected');
                // }

                return createValue(context, ...key);
            });
            week.set(weekKey, newAuto);
            return newAuto.get(rest);
        };
    };

    public static counterAutoWeakRef(): number {
        return counterAutoWeakRef.getCounter();
    }

    public static counterWeakMap(): number {
        return counterWeakMap.getCounter();
    }
}
