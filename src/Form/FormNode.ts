import * as React from 'react';
import { FormModel } from "./FormModel.ts";
import { FormChildTrait, FormChildType, FormErrorMessage, FormModelTrait, FormModelType } from "./FormTypes.ts";
import { Result } from "../Result.ts";
import { FormInputState } from "./FormInputState.ts";

/*
    //TODO
    użycie FormInputState może się zamknąć w obrębie fromFormInputState
    wszędzie dalej, można używać FormModel

    funkcje group może działać na parametrach FormModel, można się pozbyć tych kilku symboli
*/

export class FormNode<T> {
    constructor(
        public readonly value: FormModel<T>,
        public readonly jsx: React.ReactNode,
    ) {}

    public static fromFormInputState<T, M>(
        value: FormInputState<T, M>,
        render: (value: FormInputState<T, unknown>) => React.ReactNode
    ): FormNode<M> {
        const jsx = render(value);

        const model = new FormModel(
            () => [{
                [FormChildTrait]: () => value,
            }],
            () => value.result
        );

        return new FormNode(model, jsx);
    }

    public static group = <IN extends Record<keyof IN, FormNode<unknown>>>(fields: IN): FormModel<{
        readonly [P in keyof IN]: IN[P] extends FormNode<infer O> ? O : never;
    }> => {
        const fieldsValules: Array<{ [FormChildTrait](): FormChildType, [FormModelTrait](): FormModelType<unknown> }> = [];

        for (const item of Object.values(fields)) {
            //@ts-expect-error ...
            const itemType: FormNode<unknown> = item;
            fieldsValules.push(itemType.value);
        }

        type Model<T extends Record<keyof IN, FormNode<unknown>>> = {
            readonly [P in keyof T]:
                T[P] extends FormNode<infer O>
                    ? O
                    : never;
        }
        
        type TypeOut = Model<IN>;

        return new FormModel(
            () => {
                return fieldsValules;
            },
            (): Result<TypeOut, Array<FormErrorMessage>> => {
                //@ts-expect-error ...
                const modelOut: TypeOut = {};

                const errors: Array<FormErrorMessage> = [];
        
                for (const [key, item2] of Object.entries(fields)) {
                    //@ts-expect-error ...
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
                }

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
}

// React.createElement()
