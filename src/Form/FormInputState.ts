import { FormModel } from './FormModel';
import { FormBoxValue } from './FormBoxValue';
import { FormChildTrait, FormChildType, FormErrorMessage, FormModelTrait, FormModelType } from './FormTypes';
import { Result } from '../Result';

export class FormInputState<K, M> {
    private readonly box: FormBoxValue<K>;
    private readonly model: FormModel<M>;

    private constructor(box: FormBoxValue<K>, model: FormModel<M>) {
        this.box = box;
        this.model = model;
    }

    public static new<K>(value: K): FormInputState<K, K> {
        const box = new FormBoxValue<K>(() => value);
        const model = new FormModel(
            () => [box],
            (): Result<K, Array<FormErrorMessage>> => Result.ok(box.getValue())
        );

        return new FormInputState(box, model);
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
