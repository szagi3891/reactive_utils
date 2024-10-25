import { runInAction } from 'mobx';
import { assertNever } from './assertNever.ts';
import { Result } from "./Result.ts";
import { ValueUnsafe } from "./ValueUnsafe.ts";
import type { JSONValue } from "../index.ts";
import { MapJson } from "./AutoMap/MapJson.ts";
import { EventEmitter } from "./EventEmitter.ts";

//Najlepiej żeby klucz pozwalał na posortowanie listy. Po to, żeby wyrenderować szkielet, bez zagłębiania się w 
//jeśli klucz będzie bardziej złożony, to wtedy można wykorzystać AutoMap w celu nadania porównywalności po referencji, a potem sortować

type ChangeType<ID extends JSONValue, M> = {
    type: 'set',
    id: ID,
    value: M
} | {
    type: 'delete',
    id: ID
};

export class ValueList<ID extends JSONValue, M> {
    private readonly listVal: ValueUnsafe<Array<ID>>;
    private readonly modelVal: MapJson<ID, ValueUnsafe<M>>;
    private readonly events: EventEmitter<Array<ChangeType<ID, M>>>;

    constructor() {
        this.listVal = new ValueUnsafe([]);
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

    onChange(callback: (data: Array<ChangeType<ID, M>>) => void): (() => void) {
        return this.events.on(callback);
    }

    //Metoda która pozwoli na ustawienie wielu rekordów na raz lub skasowania
    bulkUpdate(data: Array<ChangeType<ID, M>>) {
        runInAction(() => {
            for (const record of data) {
                switch (record.type) {
                    case 'set': {
                        this.setInner(record.id, record.value);
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

    public set(id: ID, value: M) {
        this.bulkUpdate([{
            type: 'set',
            id,
            value,
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
}
