import { runInAction, autorun, type IReactionDisposer } from 'mobx';
import { assertNever } from './assertNever.ts';
import { Result } from "./Result.ts";
import { ValueUnsafe } from "./ValueUnsafe.ts";
import type { JSONValue } from "../index.ts";
import { MapJson } from "./AutoMap/MapJson.ts";
import { EventEmitter } from "./EventEmitter.ts";
import { stringifySort } from "./Json.ts";

//Najlepiej żeby klucz pozwalał na posortowanie listy. Po to, żeby wyrenderować szkielet, bez zagłębiania się w 
//jeśli klucz będzie bardziej złożony, to wtedy można wykorzystać AutoMap w celu nadania porównywalności po referencji, a potem sortować

class SetJson<V extends JSONValue> {
    private readonly data: Map<string, V>;
    constructor() {
        this.data = new Map();
    }

    public set(value: V) {
        const idString = stringifySort(value);
        this.data.set(idString, value);
    }

    public delete(value: V): boolean {
        const idString = stringifySort(value);
        return this.data.delete(idString);
    }

    public has(value: V): boolean {
        const idString = stringifySort(value);
        return this.data.has(idString);
    }

    values(): Array<V> {
        const list = this.data.values();
        return [...list];
    }
}

export type ValueListUpdateType<ID extends JSONValue, M> = {
    type: 'set',
    id: ID,
    model: M
} | {
    type: 'delete',
    id: ID
};

type UnsubscrbeType = () => void;
type ConnectType = () => UnsubscrbeType;

export class ValueList<ID extends JSONValue, M extends JSONValue> {
    private resetOnFirstUpdateFlag: boolean = false;
    private readonly listVal: ValueUnsafe<SetJson<ID>>;
    private modelVal: MapJson<ID, ValueUnsafe<M>>;
    private readonly events: EventEmitter<Array<ValueListUpdateType<ID, M>>>;
    private eventsSubscribe: IReactionDisposer | null = null;

    constructor(onConnect?: ConnectType) {
        this.listVal = new ValueUnsafe(new SetJson(), onConnect);
        this.modelVal = new MapJson();
        this.events = new EventEmitter((newSize: number) => {
            if (newSize === 0 && this.eventsSubscribe !== null) {
                this.eventsSubscribe();
                this.eventsSubscribe = null;
                return;
            }

            if (newSize > 0 && this.eventsSubscribe === null) {
                this.eventsSubscribe = autorun(() => {
                    this.listVal.atom.reportObserved();
                });
                return;
            }
        });
    }

    private setInner(id: ID, value: M) {
        const prevValue = this.modelVal.get(id);

        if (prevValue === undefined) {
            const newValue = new ValueUnsafe<M>(value);
            this.modelVal.set(id, newValue);

            this.listVal.value.set(id);
            this.listVal.atom.reportChanged();

            return;
        }

        prevValue.value = value;
        prevValue.atom.reportChanged();
    }

    private deleteInner(id: ID) {
        this.modelVal.delete(id);

        const deleted = this.listVal.value.delete(id);

        if (deleted) {
            this.listVal.atom.reportChanged();
        }
    }

    onChange(callback: (data: Array<ValueListUpdateType<ID, M>>) => void): (() => void) {
        const list: Array<ValueListUpdateType<ID, M>> = this.dump().map(item => ({
            type: 'set',
            ...item
        }));

        if (list.length > 0) {
            callback(list);
        }

        return this.events.on(callback);
    }

    resetOnFirstUpdate() {
        this.resetOnFirstUpdateFlag = true;
    }

    //Metoda która pozwoli na ustawienie wielu rekordów na raz lub skasowania
    bulkUpdate(data: Array<ValueListUpdateType<ID, M>>) {
        runInAction(() => {
            if (this.resetOnFirstUpdateFlag) {
                this.resetOnFirstUpdateFlag = false;

                this.listVal.value = new SetJson();
                this.listVal.atom.reportChanged();
                this.modelVal = new MapJson();
            }

            for (const record of data) {
                switch (record.type) {
                    case 'set': {
                        this.setInner(record.id, record.model);
                        break;
                    }
                    case 'delete': {
                        this.deleteInner(record.id);
                        break;
                    }
                    default: {
                        assertNever(record);
                    }
                }
            }

            this.events.trigger(data);
        });
    }
    
    bulkReplace(data: Array<{ id: ID, model: M }>) {
        const updateList: Array<ValueListUpdateType<ID, M>> = [];
        const newIds = new Set(data.map(item => item.id));

        for (const currentId of this.listVal.value.values()) {
            if (newIds.has(currentId)) {
                //ok, that remains
            } else {
                updateList.push({
                    type: 'delete',
                    id: currentId
                });
            }
        }

        for (const item of data) {
            const current = this.modelVal.get(item.id)?.value;

            if (current === undefined) {
                updateList.push({
                    type: 'set',
                    id: item.id,
                    model: item.model
                });
            } else {
                const prevValue = stringifySort(current);
                const newValue = stringifySort(item.model);

                if (prevValue !== newValue) {
                    updateList.push({
                        type: 'set',
                        id: item.id,
                        model: item.model
                    });
                }
            }
        }

        this.bulkUpdate(updateList);
    }

    public set(id: ID, model: M) {
        this.bulkUpdate([{
            type: 'set',
            id,
            model,
        }]);
    }

    public delete(id: ID) {
        this.bulkUpdate([{
            type: 'delete',
            id,
        }]);
    }

    //Te dwie metody, przeznaczone byłyby dla widoku
    //Id mógłby być tak skonstruowany, żeby dało się po nim sortować

    //getter pozwalający pobrać listę idków
    get ids(): Array<ID> {
        this.listVal.atom.reportObserved();
        return this.listVal.value.values();
    }

    //pobranie konkretnego modelu
    model(id: ID): Result<M, null> {
        const model = this.modelVal.get(id);
        if (model === undefined) {
            return Result.error(null);
        }

        model.atom.reportObserved();
        return Result.ok(model.value);
    }

    dump(): Array<{ id: ID, model: M}> {
        const result: Array<{ id: ID, model: M}> = [];

        for (const id of this.ids) {
            const model = this.model(id);

            if (model.type === 'ok') {
                result.push({id, model: model.value});
            } else {
                throw Error('Nieprawidłowe odgałęzienie programu');
            }
        }

        return result;
    }
}
