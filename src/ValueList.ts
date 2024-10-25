import { action } from 'mobx';
import { assertNever } from './assertNever.ts';
import { Result } from "./Result.ts";
import { ValueUnsafe } from "./ValueUnsafe.ts";
import type { JSONValue } from "../index.ts";
import { MapJson } from "./AutoMap/MapJson.ts";

//Najlepiej żeby klucz pozwalał na posortowanie listy. Po to, żeby wyrenderować szkielet, bez zagłębiania się w 
//jeśli klucz będzie bardziej złożony, to wtedy można wykorzystać AutoMap w celu nadania porównywalności po referencji, a potem sortować

export class ValueList<ID extends JSONValue, M> {
    private readonly listVal: ValueUnsafe<Array<ID>>;
    private readonly modelVal: MapJson<ID, ValueUnsafe<M>>;

    constructor() {
        this.listVal = new ValueUnsafe([]);
        this.modelVal = new MapJson();
    }

    set(key: ID, value: M) {
        const prevValue = this.modelVal.get(key);

        if (prevValue === undefined) {
            const newValue = new ValueUnsafe<M>(value);
            //TODO - dodać id do listy
            this.modelVal.set(key, newValue);

            //TODO - dodać emitowanie zdarzenia

            return;
        }

        prevValue.value = value;
        prevValue.atom.reportChanged();

        //TODO - dodać emitowanie zdarzenia
    }

    delete(key: ID) {
        this.modelVal.delete(key);

        if (this.listVal.value.includes(key)) {
            this.listVal.value = this.listVal.value.filter(item => item !== key);
            this.listVal.atom.reportChanged();
        }
    }

    onChange(callback: (data: Array<{ type: 'set', id: ID, value: M } | { type: 'delete', id: ID }>) => void): (() => void) {
        
        throw Error('aaa');
    }

    //Metoda która pozwoli na ustawienie wielu rekordów na raz lub skasowania
    bulkUpdate(data: Array<{ type: 'set', id: ID, value: M } | { type: 'delete', id: ID }>) {
        action(() => {
            for (const record of data) {
                switch (record.type) {
                    case 'set': {
                        this.set(record.id, record.value);
                        break;
                    }
                    case 'delete': {
                        this.delete(record.id);
                        break;
                    }
                    default: {
                        assertNever(record);
                    }
                }
            }
        });
    }

    //Te dwie metody, przeznaczone byłyby dla widoku
    //Id mógłby być tak skonstruowany, żeby dało się po nim sortować

    //getter pozwalający pobrać listę idków
    list(): Array<ID> {
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
