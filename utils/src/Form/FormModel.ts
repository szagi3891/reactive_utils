import { Result } from '../Result.ts';
import { FormChildList } from "./FormChildList.ts";
import { FormErrorMessage, FormChildTrait, FormChildType, FormModelTrait, FormModelType, errorForView, StateForViewType } from './FormTypes.ts';

export class FormModel<V> implements FormModelType<V> {

    public constructor(
        private readonly child: FormChildList,
        private readonly getValue: () => Result<V, Array<FormErrorMessage>>
    ) {
    }

    public map<C>(conv: (value: V) => Result<C, string>): FormModel<C> {
        return new FormModel(
            new FormChildList([this]),
            (): Result<C, Array<FormErrorMessage>> => {
                const value = this.getValue();

                if (value.type === 'error') {
                    return value;
                }

                const result = conv(value.data);

                if (result.type === 'ok') {
                    return Result.ok(result.data);
                }
        
                const isVisited = this.isVisited();
                const error = new FormErrorMessage([], isVisited, result.error);
                return Result.error([error]);
            });
    }

    public get result(): Result<V, Array<FormErrorMessage>> {
        const result = this.getValue();
        return result;
    }

    /**
     * @deprecated - use stateForView
     */
    public get errorForView(): string | null {
        if (this.result.type === 'error') {
            return errorForView(this.result.error);
        }
        return null;
    }

    public get stateForView(): StateForViewType {
        if (this.result.type === 'error') {
            const error = errorForView(this.result.error);

            if (error !== null) {
                return {
                    type: "error",
                    message: error,
                };
            }
        }

        if (this.isVisited() === false) {
            return {
                type: 'not-visited'
            };
        }


        return {
            type: 'ok',
        };
    }

    public get isValid(): boolean {
        return this.result.type === 'ok';
    }

    public setAsVisited(): void {
        this.child.setAsVisited();
    }

    public isVisited(): boolean {
        return this.child.isVisited();
    }

    public get isModified(): boolean {
        return this.child.isModified;
    }

    public reset(): void {
        this.child.reset();
    }

    [FormChildTrait](): FormChildType {
        return this;
    }

    [FormModelTrait](): FormModelType<V> {
        return this;
    }
}

