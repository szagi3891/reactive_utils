import { PrimitiveType, reduceComplexSymbol } from "./PrimitiveType.ts";
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

export class AutoMap<K extends PrimitiveType[] | PrimitiveType, V> {
    private data: AutoMapSerialized<K, V>;

    public constructor(getValue: (id: K) => V) {
        this.data = new AutoMapSerialized((id: K) => stringifySort(reduceComplexSymbol(id)), getValue);
    }

    public get(id: K): V {
        return this.data.get(id);
    }

    static create = <K extends PrimitiveType[], V>(
        createValue: (...key: [...K]) => V
    ): ((...key: [...K]) => V) => {
        const data: AutoMap<K, V> = new AutoMap((key: K): V => {
            return createValue(...key);
        });
    
        return (...key: [...K]): V => {
            return data.get(key);
        };
    };
}
