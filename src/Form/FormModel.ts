import { Result } from '../Result';
import { Value } from '../Value';
import { FormErrorMessage, FormChildTrait, FormChildType, FormModelTrait, FormModelType, errorForView } from './FormTypes';

type FormRecordBox = Record<string, { [FormChildTrait](): FormChildType, [FormModelTrait](): FormModelType<unknown> }>;

export class FormModel<V> {
    private getChild: () => Array<{[FormChildTrait](): FormChildType}>;
    private getValue: () => Result<V, Array<FormErrorMessage>>;

    public constructor(getChild: () => Array<{[FormChildTrait](): FormChildType}>, getValue: () => Result<V, Array<FormErrorMessage>>) {
        this.getChild = getChild;
        this.getValue = getValue;
    }

    public map<C>(conv: (value: V) => Result<C, string>): FormModel<C> {
        return new FormModel(
            () => [this],
            (): Result<C, Array<FormErrorMessage>> => {
                const value = this.getValue();

                if (value.type === 'ok') {
                    const result = conv(value.value);
                    const isVisited = this.isVisited();

                    if (result.type === 'ok') {
                        return Result.ok(result.value);
                    }
            
                    const error = new FormErrorMessage([], isVisited, result.error);
                    return Result.error([error]);
                }

                return Result.error(value.error);
            });
    }

    public get result(): Result<V, Array<FormErrorMessage>> {
        const result = this.getValue();
        return result;
    }

    public get errorForView(): string | null {
        if (this.result.type === 'error') {
            return errorForView(this.result.error);
        }
        return null;
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
    public static group = <IN extends FormRecordBox>(fields: IN): FormModel<{
        readonly [P in keyof IN]: IN[P] extends FormModelType<infer O> ? O : never;
    }> => {
        const fieldsValules: Array<{ [FormChildTrait](): FormChildType, [FormModelTrait](): FormModelType<unknown> }> = [];

        for (const item of Object.values(fields)) {
            fieldsValules.push(item);
        }

        type Model<T extends FormRecordBox> = {
            readonly [P in keyof T]:
                T[P] extends FormModelType<infer O>
                    ? O
                    : never;
        }
        
        type TypeOut = Model<IN>;

        return new FormModel(
            () => {
                return fieldsValules;
            },
            (): Result<TypeOut, Array<FormErrorMessage>> => {
                //@ts-expect-error
                const modelOut: TypeOut = {};

                const errors: Array<FormErrorMessage> = [];
        
                for (const [key, item] of Object.entries(fields)) {
                    const result = item[FormModelTrait]().result;
                    if (result.type === 'ok') {
                        const innerValue = result.value;

                        //@ts-expect-error
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

    public static groupFromArray = <K>(fieldsValue: Value<Array<{ [FormChildTrait](): FormChildType, [FormModelTrait](): FormModelType<K> }>>): FormModel<Array<K>> => {
        return new FormModel(
            () => {
                return fieldsValue.getValue();
            },
            (): Result<Array<K>, Array<FormErrorMessage>> => {
                const modelOut: Array<K> = [];
                const errors: Array<FormErrorMessage> = [];

                const models = fieldsValue.getValue();

                for (const [index, item] of models.entries()) {
                    const result = item[FormModelTrait]().result;
                    if (result.type === 'ok') {
                        modelOut.push(result.value);
                    } else {
                        for (const error of result.error) {
                            errors.push(error.unshiftPath(`[${index}]`));
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

    [FormChildTrait](): FormChildType {
        return this;
    }

    [FormModelTrait](): FormModelType<V> {
        return this;
    }
}

