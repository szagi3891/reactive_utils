
import { Value } from '../Value';
import { FormChildTrait, FormChildType } from './FormTypes';

type Option<K> = {
    type: 'some',
    value: K,
} | {
    type: 'none',
};

export class FormBoxValue<K> {
    private value: Value<Option<K>>;
    private visited: Value<boolean>;

    public constructor(private initValue: () => K) {
        this.value = new Value({
            type: 'none',
        });
        this.visited = new Value(false);
    }

    public setAsVisited(): void {
        this.visited.setValue(true);
    }

    public isVisited(): boolean {
        return this.visited.getValue();
    }

    public setValue(value: K) {
        this.value.setValue({
            type: 'some',
            value
        });
    }

    public getValue(): K {
        const value = this.value.getValue();

        if (value.type === 'some') {
            return value.value;
        }

        return this.initValue();
    }

    public get isModified(): boolean {
        const value = this.value.getValue();

        if (value.type === 'none') {
            return false;
        }

        return value.value !== this.initValue();
    }

    public reset(): void {
        this.value.setValue({
            type: 'none'
        });
    }

    [FormChildTrait](): FormChildType {
        return this;
    }
}

