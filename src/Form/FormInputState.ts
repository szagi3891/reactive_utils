import { FormModel } from './FormModel.ts';
import { FormBoxValue } from './FormBoxValue.ts';
import { FormChildTrait, FormChildType, FormErrorMessage, FormModelTrait, FormModelType } from './FormTypes.ts';
import { Result } from '../Result.ts';
import { FormNode } from "./FormNode.ts";

export class FormInputState<K, M> implements FormModelType<M> {
    private readonly box: FormBoxValue<K>;
    private readonly model: FormModel<M>;

    private constructor(box: FormBoxValue<K>, model: FormModel<M>) {
        this.box = box;
        this.model = model;
    }

    public static fromValue<K>(value: K): FormInputState<K, K> {
        const box = new FormBoxValue<K>(() => value);
        const model = new FormModel(
            () => [box],
            (): Result<K, Array<FormErrorMessage>> => Result.ok(box.getValue())
        );

        return new FormInputState(box, model);
    }

    public static fromModel<K>(getValue: () => K): FormInputState<K, K> {
        const box = new FormBoxValue<K>(getValue);
        const model = new FormModel<K>(
            () => [box],
            (): Result<K, Array<FormErrorMessage>> => Result.ok(box.getValue())
        );

        return new FormInputState<K, K>(box, model);
    }

    public static from<K>(getValue: (() => K) | K): FormInputState<K, K> {
        if (typeof getValue === 'function') {
            //@ts-expect-error ...
            const getValueType: () => K = getValue;
            return FormInputState.fromModel(getValueType);
        }

        return FormInputState.fromValue(getValue);
    }

    public render(render: (input: FormInputState<K, unknown>) => React.ReactNode): FormNode<M> {
        return FormNode.fromFormInputState(
            this,
            render
        );
    }

    public setValue(value: K): void {
        this.box.setValue(value);
    }

    public get value(): K {
        return this.box.getValue();
    }

    public isVisited(): boolean {
        return this.box.isVisited();
    }

    public map<M2>(convert: (value: M) => Result<M2, string>): FormInputState<K, M2> {
        const model2 = this.model.map(convert);
        return new FormInputState(this.box, model2);
    }

    public get result(): Result<M, Array<FormErrorMessage>> {
        return this.model.result;
    }

    public get errorForView(): string | null {
        return this.model.errorForView;
    }

    public get isValid(): boolean {
        return this.result.type === 'ok';
    }

    public setAsVisited(): void {
        this.model.setAsVisited();
    }

    public get isModified(): boolean {
        return this.box.isModified;
    }

    public reset() {
        this.box.reset();
    }

    [FormChildTrait](): FormChildType {
        return this;
    }

    [FormModelTrait](): FormModelType<M> {
        return this;
    }
}
