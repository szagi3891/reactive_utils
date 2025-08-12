import { reduceComplexSymbol, type PrimitiveJSONValue } from "./PrimitiveType.ts";
import { stringifySort } from '../Json.ts';

class AutoMapSerialized<K, V> {
    private data: Map<string, V>;

    public constructor(private readonly serializeKey: (id: K) => string, private readonly getValue: (id: K) => V) {
        this.data = new Map();
    }

    public get(id: K): V {
        const idString = this.serializeKey(id);
        const item = this.data.get(idString);

        if (item !== undefined) {
            return item;
        }

        const newItem = this.getValue(id);

        this.data.set(idString, newItem);
        return newItem;
    }
}

export class AutoMap<K extends PrimitiveJSONValue, V> {
    private data: AutoMapSerialized<K, V>;

    public constructor(getValue: (id: K) => V) {
        this.data = new AutoMapSerialized((id: K) => stringifySort(reduceComplexSymbol(id)), getValue);
    }

    public get(id: K): V {
        return this.data.get(id);
    }

    static create = <K extends PrimitiveJSONValue[], V>(
        createValue: (...key: [...K]) => V
    ): ((...key: [...K]) => V) => {
        const data: AutoMap<K, V> = new AutoMap((key: K): V => {
            return createValue(...key);
        });

        return (...key: [...K]): V => {
            
            //@ts-expect-error - if the function create, is created with redundant parameters, they will be truncated
            const newKey: K = key.slice(0, createValue.length);

            return data.get(newKey);
        };
    };
}
