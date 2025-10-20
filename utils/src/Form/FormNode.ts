import * as React from 'react';
import { FormModel } from "./FormModel.ts";
import { FormChildTrait, FormChildType, FormErrorMessage, FormModelTrait, FormModelType } from "./FormTypes.ts";
import { Result } from "../Result.ts";
import { FormInputState } from "./FormInputState.ts";
import { FormChildList } from "./FormChildList.ts";
import { typedEntries2 } from "./typedEntries2.ts";

export class FormNode<T> {
    constructor(
        public readonly value: FormModel<T>,
        public readonly jsx: React.ReactElement,
    ) {}

    public static fromFormInputState<T, M>(
        value: FormInputState<T, M>,
        render: (value: FormInputState<T, unknown>) => React.ReactElement
    ): FormNode<M> {
        const model = new FormModel(
            new FormChildList([{
                [FormChildTrait]: () => value,
            }]),
            () => value.result
        );

        return new FormNode(model, render(value));
    }

    public static group = <IN extends Record<keyof IN, FormNode<unknown>>>(fields: IN): FormModel<{
        readonly [P in keyof IN]: IN[P] extends FormNode<infer O> ? O : never;
    }> => {
        const fieldsValules: Array<{
            [FormChildTrait](): FormChildType,
            [FormModelTrait](): FormModelType<unknown>
        }> = [];

        typedEntries2(fields, (_key, item) => {
            const itemType: FormNode<unknown> = item;
            fieldsValules.push(itemType.value);
        });

        type Model<T extends Record<keyof IN, FormNode<unknown>>> = {
            readonly [P in keyof T]:
                T[P] extends FormNode<infer O>
                    ? O
                    : never;
        }
        
        type TypeOut = Model<IN>;

        return new FormModel(
            new FormChildList(fieldsValules),
            (): Result<TypeOut, Array<FormErrorMessage>> => {
                //@ts-expect-error ...
                const modelOut: TypeOut = {};

                const errors: Array<FormErrorMessage> = [];
        
                typedEntries2(fields, (key, item2) => {
                    const item: FormNode<unknown> = item2;
                    const result = item.value[FormModelTrait]().result;
                    if (result.type === 'ok') {
                        const innerValue = result.data;

                        //@ts-expect-error ...
                        modelOut[key] = innerValue;
                    } else {
                        for (const error of result.error) {
                            errors.push(error.unshiftPath(key));
                        }
                    }
                });

                if (errors.length === 0) {
                    return Result.ok(modelOut);
                } else {
                    return Result.error(errors);
                }
            }
        );
    };

    public map<C>(conv: (value: T) => Result<C, string>): FormNode<C> {
        return new FormNode(
            this.value.map(conv),
            this.jsx,
        );
    }

    public renderError(render: (node: FormNode<T>) => React.ReactElement): FormNode<T> {
        return new FormNode(
            this.value,
            render(this)
        );
    } 
}
