import { AutoMap } from "./AutoMap.ts";
import { AllocationCounter } from "./AllocationCounter.ts";
import { type PrimitiveJSONValue } from "./PrimitiveType.ts";
import { whenDrop } from "./whenDrop.ts";


const counterAutoWeakRef = new AllocationCounter((count: number) => {
    console.info(`AutoWeakRef count=${count}`);
});


const autoWeakRefSymbol = Symbol();

const symbolDeref = (deref: () => void): symbol => {
    const derefSymbol = Symbol();
    whenDrop(derefSymbol, deref);
    return derefSymbol;
};

class SubscriptionManager {

    private data: Set<(autoWeakRef: AutoWeakRef) => void> = new Set();

    unregister(autoWeakRef: AutoWeakRef) {
        for (const callback of this.data) {
            callback(autoWeakRef);
        }
    }

    add(callback: (autoWeakRef: AutoWeakRef) => void) {
        this.data.add(callback);
    }
}

const subscriptionManager = new SubscriptionManager();


export class AutoWeakRef {
    private isDeref: boolean = false;
    private inner: typeof autoWeakRefSymbol = autoWeakRefSymbol;

    private constructor() {
        console.info(`AutoWeakRef constructor`, this.inner);
        counterAutoWeakRef.up(this);
    }

    public static create(): [AutoWeakRef, () => void] {
        const ref = new AutoWeakRef();

        // let isDeref = false;

        return [
            ref,
            ref.deref,
            // (): void => {
            //     if (isDeref === true) {
            //         console.error('AutoWeakRef: deref: The object had already been released.');
            //         return;
            //     }

            //     isDeref = true;

            //     console.info(`AutoWeakRef unregister`);
            //     subscriptionManager.unregister(ref);
            // }
        ]
    }

    private deref = () => {
        if (this.isDeref === true) {
            console.error('AutoWeakRef: deref: The object had already been released.');
            return;
        }

        this.isDeref = true;

        console.info(`AutoWeakRef unregister`);
        subscriptionManager.unregister(this);
    }

    public static symbolDeref(deref: () => void): symbol {
        return symbolDeref(deref);
    }

    public static objectCounter(): number {
        return counterAutoWeakRef.getCounter();
    }
}

export const autoWeakMapKey = Symbol('AutoWeakMapKey');

class AutoWeakMap0<C extends { [autoWeakMapKey]: () => AutoWeakRef }, K extends PrimitiveJSONValue[], V> {
    private readonly week: Map<AutoWeakRef, AutoMap<K, V>>;

    constructor(private readonly createValue: (...key: [C, ...K]) => V) {
        this.week = new Map();

        subscriptionManager.add((autoWeakRef) => {
            this.week.delete(autoWeakRef);
        });
    }

    create = (...key: [C, ...K]): V => {
        const [context, ...rest] = key;
        const weekKey = context[autoWeakMapKey]();
        const weekContet: WeakRef<C> = new WeakRef(context);

        const autoMap = this.week.get(weekKey);

        if (autoMap !== undefined) {
            return autoMap.get(rest);
        }

        const newAuto = new AutoMap<K, V>((key) => {
            const context = weekContet.deref();

            if (context === undefined) {
                throw Error('context expected');
            }

            return this.createValue(context, ...key);
        });
        this.week.set(weekKey, newAuto);
        return newAuto.get(rest);
    };
}

export class AutoWeakMap {
    public static create = <C extends { [autoWeakMapKey]: () => AutoWeakRef }, K extends PrimitiveJSONValue[], V>(
        createValue: (...key: [C, ...K]) => V
    ): ((...key: [C, ...K]) => V) => {

        const state = new AutoWeakMap0(createValue);
        return state.create;
    };

    // public static objectCounter(): number {
    //     return counterWeakMap.getCounter();
    // }
}

// export class AutoWeakMap {

//     public static create = <C extends { [autoWeakMapKey]: () => AutoWeakRef }, K extends PrimitiveJSONValue[], V>(
//         createValue: (...key: [C, ...K]) => V
//     ): ((...key: [C, ...K]) => V) => {

//         const week = new Map<AutoWeakRef, AutoMap<K, V>>();

//         subscriptionManager.add((autoWeakRef) => {
//             console.info('czyszczę ', week.get(autoWeakRef)?.size);
//             week.delete(autoWeakRef);
//         });

//         // counterWeakMap.up(week);

//         return (...key: [C, ...K]): V => {
//             const [context, ...rest] = key;
//             const weekKey = context[autoWeakMapKey]();
//             const weekContet: WeakRef<C> = new WeakRef(context);

//             const autoMap = week.get(weekKey);

//             if (autoMap !== undefined) {
//                 return autoMap.get(rest);
//             }

//             const newAuto = new AutoMap<K, V>((key) => {
//                 const context = weekContet.deref();

//                 if (context === undefined) {
//                     throw Error('context expected');
//                 }

//                 return createValue(context, ...key);
//             });
//             week.set(weekKey, newAuto);
//             return newAuto.get(rest);
//         };
//     };

//     // public static objectCounter(): number {
//     //     return counterWeakMap.getCounter();
//     // }
// }
