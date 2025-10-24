import { FormModel } from './FormModel.ts';
import { FormBoxValue } from './FormBoxValue.ts';
import { FormChildTrait, FormChildType, FormErrorMessage, FormModelTrait, FormModelType, StateForViewType } from './FormTypes.ts';
import { Result } from '../Result.ts';
import { FormNode } from "./FormNode.ts";
import { FormChildList } from "./FormChildList.ts";

interface Params<K> {
    default: K,
    getValue: () => Result<K, string>
}

export class FormInputState<K, M> implements FormModelType<M> {
    private constructor(
        private readonly defaultValue: K,
        private readonly box: FormBoxValue<K>,
        private readonly model: FormModel<M>) {
    }

    public static from<K>(params: Params<K>): FormInputState<K, K> {
        const box = new FormBoxValue<K>(params.getValue);

        const model = new FormModel<K>(
            new FormChildList([box]),
            (): Result<K, Array<FormErrorMessage>> => {

                // const value = getValue();

                // if (value.type === 'error') {
                //     return Result.error([new FormErrorMessage([], box.isVisited(), value.error)]);
                // }

                const boxValue = box.getValue();

                if (boxValue.type === 'error') {
                    return Result.error([new FormErrorMessage([], box.isVisited(), boxValue.error)]);
                }

                return boxValue;
            }
        );

        return new FormInputState<K, K>(params.default, box, model);
    }

    public render(render: (input: FormInputState<K, unknown>) => React.ReactElement): FormNode<M> {
        return FormNode.fromFormInputState(
            this,
            render
        );
    }

    public setValue(value: K): void {
        this.box.setValue(value);
    }

    public get value(): K {
        const value = this.box.getValue();

        if (value.type === 'ok') {
            return value.data;
        }

        return this.defaultValue;
    }

    public isVisited(): boolean {
        return this.box.isVisited();
    }

    public map<M2>(convert: (value: M) => Result<M2, string>): FormInputState<K, M2> {
        return new FormInputState(
            this.defaultValue,
            this.box,
            this.model.map(convert)
        );
    }

    public get result(): Result<M, Array<FormErrorMessage>> {
        return this.model.result;
    }

    /**
     * @deprecated - use stateForView
     */
    public get errorForView(): string | null {
        return this.model.errorForView;
    }

    public get stateForView(): StateForViewType {
        return this.model.stateForView;
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
