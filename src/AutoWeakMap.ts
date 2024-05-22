import { AutoMap, PrimitiveType } from "./AutoMap";

export const autoWeakMapKey = Symbol('AutoWeakMapKey');

export class AutoWeakMap<K extends { [autoWeakMapKey]: () => void }, V> {
    private data: WeakMap<K, V>;

    constructor(private readonly createValue: (key: K) => V) {
        this.data = new Map();
    }

    get(id: K): V {
        const value = this.data.get(id);

        if (value !== undefined) {
            return value;
        }

        const newValue = this.createValue(id);
        this.data.set(id, newValue);
        return newValue;
    }

    public static create = <C extends { [autoWeakMapKey]: () => void }, K extends PrimitiveType[], V>(
        createValue: (...key: [C, ...K]) => V
    ): ((...key: [C, ...K]) => V) => {

        type AutoMapFunc = (key: K) => V;

        const weakMap: AutoWeakMap<C, AutoMapFunc> = new AutoWeakMap(
            (context: C): AutoMapFunc => {            
                const autoMap = AutoMap.create<K, V>(
                    (...key: K) => createValue(context, ...key)
                );
                return (key: K): V => autoMap(...key);
            }
        );

        return (...key: [C, ...K]): V => {
            const [context, ...rest] = key;
            return weakMap.get(context)(rest);
        };
    };

}
