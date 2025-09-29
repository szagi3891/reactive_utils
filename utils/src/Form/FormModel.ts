import { Result } from '../Result.ts';
import { FormErrorMessage, FormChildTrait, FormChildType, FormModelTrait, FormModelType, errorForView, StateForViewType } from './FormTypes.ts';
import { groupFormModel } from "./groupFormModel.ts";

export class FormModel<V> implements FormModelType<V> {
    private getChild: () => Array<{[FormChildTrait](): FormChildType}>;
    private getValue: () => Result<V, Array<FormErrorMessage>>;

    public constructor(
        getChild: () => Array<{[FormChildTrait](): FormChildType}>,
        getValue: () => Result<V, Array<FormErrorMessage>>
    ) {
        this.getChild = getChild;
        this.getValue = getValue;
    }

    public map<C>(conv: (value: V) => Result<C, string>): FormModel<C> {
        return new FormModel(
            () => [this],
            (): Result<C, Array<FormErrorMessage>> => {
                const value = this.getValue();

                if (value.type === 'ok') {
                    const result = conv(value.data);
                    const isVisited = this.isVisited();

                    if (result.type === 'ok') {
                        return Result.ok(result.data);
                    }
            
                    const error = new FormErrorMessage([], isVisited, result.error);
                    return Result.error([error]);
                }

                return Result.error(value.error);
            });
    }

    /**
     * @deprecated - do usunięcia ta funkcja
     */
    public static group = groupFormModel;

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
                }
            }
        }

        if (this.isVisited() === false) {
            return {
                type: 'not-visited'
            };
        }


        return {
            type: 'ok',
        }
    }

    public get isValid(): boolean {
        return this.result.type === 'ok';
    }

    public setAsVisited(): void {
        for (const child of this.getChild()) {
            child[FormChildTrait]().setAsVisited();
        }
    }

    public isVisited(): boolean {
        for (const item of this.getChild()) {
            if (item[FormChildTrait]().isVisited() === false) {
                return false;
            }
        }

        return true;
    }

    public get isModified(): boolean {
        for (const item of this.getChild()) {
            if (item[FormChildTrait]().isModified) {
                return true;
            }
        }

        return false;
    }

    public reset(): void {
        for (const item of this.getChild()) {
            item[FormChildTrait]().reset();
        }
    }

    [FormChildTrait](): FormChildType {
        return this;
    }

    [FormModelTrait](): FormModelType<V> {
        return this;
    }
}

