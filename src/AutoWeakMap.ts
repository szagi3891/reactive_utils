import { AutoMap, PrimitiveType } from "./AutoMap";

export const autoWeakMapKey = Symbol('AutoWeakMapKey');

export class AutoWeakMap {
    public static create = <C extends { [autoWeakMapKey]: () => void }, K extends PrimitiveType[], V>(
        createValue: (...key: [C, ...K]) => V
    ): ((...key: [C, ...K]) => V) => {

        // this commented version has a memory leak
        // type AutoMapFunc = (key: K) => V;

        // const weakMap: AutoWeakMap<C, AutoMapFunc> = new AutoWeakMap(
        //     (context: C): AutoMapFunc => {            
        //         const autoMap = AutoMap.create<K, V>(
        //             (...key: K) => createValue(context, ...key)
        //         );
        //         return (key: K): V => autoMap(...key);
        //     }
        // );

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
