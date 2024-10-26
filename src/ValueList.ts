import { runInAction } from 'mobx';
import { assertNever } from './assertNever.ts';
import { Result } from "./Result.ts";
import { ValueUnsafe } from "./ValueUnsafe.ts";
import type { JSONValue } from "../index.ts";
import { MapJson } from "./AutoMap/MapJson.ts";
import { EventEmitter } from "./EventEmitter.ts";

//Najlepiej żeby klucz pozwalał na posortowanie listy. Po to, żeby wyrenderować szkielet, bez zagłębiania się w 
//jeśli klucz będzie bardziej złożony, to wtedy można wykorzystać AutoMap w celu nadania porównywalności po referencji, a potem sortować

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
    private readonly listVal: ValueUnsafe<Array<ID>>;
    private modelVal: MapJson<ID, ValueUnsafe<M>>;
    private readonly events: EventEmitter<Array<ValueListUpdateType<ID, M>>>;

    constructor(onConnect?: ConnectType) {
        this.listVal = new ValueUnsafe([], onConnect);
        this.modelVal = new MapJson();
        this.events = new EventEmitter();
    }

    private setInner(id: ID, value: M) {
        const prevValue = this.modelVal.get(id);

        if (prevValue === undefined) {
            const newValue = new ValueUnsafe<M>(value);
            this.modelVal.set(id, newValue);

            this.listVal.value.push(id);
            this.listVal.atom.reportChanged();

            return;
        }

        prevValue.value = value;
        prevValue.atom.reportChanged();
    }

    private deleteInner(id: ID) {
        this.modelVal.delete(id);

        if (this.listVal.value.includes(id)) {
            this.listVal.value = this.listVal.value.filter(item => item !== id);
            this.listVal.atom.reportChanged();
        }
    }

    onChange(callback: (data: Array<ValueListUpdateType<ID, M>>) => void): (() => void) {
        callback(this.dump().map(item => ({
            type: 'set',
            ...item
        })));

        return this.events.on(callback);
    }

    resetOnFirstUpdate() {
        this.resetOnFirstUpdateFlag = true;
    }

    //Metoda która pozwoli na ustawienie wielu rekordów na raz lub skasowania
    bulkUpdate(data: Array<ValueListUpdateType<ID, M>>) {
        console.info('bulk update', data);

        runInAction(() => {
            if (this.resetOnFirstUpdateFlag) {
                this.resetOnFirstUpdateFlag = false;

                this.listVal.value = [];
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

        throw Error('TODO');
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
        return this.listVal.value;
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
