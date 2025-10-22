
import { Result } from "../Result.ts";
import { Signal } from '../reactive/Signal.ts';
import { FormChildTrait, FormChildType } from './FormTypes.ts';

type Option<K> = {
    type: 'some',
    value: K,
} | {
    type: 'none',
};

export class FormBoxValue<K> {
    private value: Signal<Option<K>>;
    private visited: Signal<boolean>;

    public constructor(private readonly getInitValue: () => Result<K, string>) {
        this.value = new Signal({
            type: 'none',
        });
        this.visited = new Signal(false);
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

    public getValue(): Result<K, string> {
        const value = this.value.getValue();

        if (value.type === 'some') {
            return Result.ok(value.value);
        }

        return this.getInitValue();
    }

    public get isModified(): boolean {
        const value = this.value.getValue();

        if (value.type === 'none') {
            return false;
        }

        const initValue = this.getInitValue();

        if (initValue.type === 'error') {
            return false;
        }

        return value.value !== initValue.data;
    }

    public reset(): void {
        this.value.setValue({
            type: 'none'
        });
        this.visited.setValue(false);
    }

    [FormChildTrait](): FormChildType {
        return this;
    }
}

