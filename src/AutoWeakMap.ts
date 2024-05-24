import { AutoMap, PrimitiveType } from "./AutoMap";

export const autoWeakMapKey = Symbol('AutoWeakMapKey');

export class AutoWeakMap {
    public static create = <C extends { [autoWeakMapKey]: () => void }, K extends PrimitiveType[], V>(
        createValue: (...key: [C, ...K]) => V
    ): ((...key: [C, ...K]) => V) => {

        const week = new WeakMap<C, AutoMap<K, V>>();

        return (...key: [C, ...K]): V => {
            const [context, ...rest] = key;

            const weekMap = week.get(context);

            if (weekMap !== undefined) {
                return weekMap.get(rest);
            }

            const newAuto = new AutoMap<K, V>((key) => {
                return createValue(context, ...key);
            });
            week.set(context, newAuto);
            return newAuto.get(rest);
        };
    };

}

/*
Pasowałoby zrobić tak, zeby automapa, potrafiła pobrać element, zarówno jak podejemy CommonRef, jak równiez gdy podajemy Common


const ref2common = new WeakMap<CommonRef, Common>();
const common2ref = new WeakMap<Common, CommonRef>();

class CommonRef {

}
class Common {

}
*/

//mając common, niech za pomoca WekMapy, odwołamy się do tego obiektu "adresujacego" wekMap

/*
    ContextRef
        ma referencję do Context wewnętrzneg

    mając kontekst wewnętrzny, móc się odwołąć do kontekstu zewnętrznego
        WekMap, która trzyma WekRef na kontekst
*/