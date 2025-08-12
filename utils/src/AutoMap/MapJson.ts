import { stringifySort, type JSONValue } from "../Json.ts";

export class MapJson<K extends JSONValue, V> {

    private readonly data: Map<string, V> = new Map();

    public set(key: K, value: V) {
        const idString = stringifySort(key);
        this.data.set(idString, value);
    }

    public get(key: K): V | undefined {
        const idString = stringifySort(key);
        return this.data.get(idString);
    }

    public delete(key: K) {
        const idString = stringifySort(key);
        return this.data.delete(idString);
    }
}

