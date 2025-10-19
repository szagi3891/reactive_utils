import { Result } from "../Result.ts";
import { FormChildList } from "./FormChildList.ts";
import { FormModel } from "./FormModel.ts";
import { FormErrorMessage, FormChildTrait, FormChildType, FormModelTrait, FormModelType } from './FormTypes.ts';

type FormRecordBox = Record<string, { [FormChildTrait](): FormChildType, [FormModelTrait](): FormModelType<unknown> }>;

/**
 * @deprecated - do usunięcia ta funkcja
 */
export const groupFormModel = <IN extends FormRecordBox>(fields: IN): FormModel<{
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
        new FormChildList(fieldsValules),
        (): Result<TypeOut, Array<FormErrorMessage>> => {
            //@ts-expect-error ...
            const modelOut: TypeOut = {};

            const errors: Array<FormErrorMessage> = [];
    
            for (const [key, item] of Object.entries(fields)) {
                const result = item[FormModelTrait]().result;
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

// public static groupFromArray = <K>(fieldsValue: Value<Array<{ [FormChildTrait](): FormChildType, [FormModelTrait](): FormModelType<K> }>>): FormModel<Array<K>> => {
//     return new FormModel(
//         () => {
//             return fieldsValue.getValue();
//         },
//         (): Result<Array<K>, Array<FormErrorMessage>> => {
//             const modelOut: Array<K> = [];
//             const errors: Array<FormErrorMessage> = [];

//             const models = fieldsValue.getValue();

//             for (const [index, item] of models.entries()) {
//                 const result = item[FormModelTrait]().result;
//                 if (result.type === 'ok') {
//                     modelOut.push(result.data);
//                 } else {
//                     for (const error of result.error) {
//                         errors.push(error.unshiftPath(`[${index}]`));
//                     }
//                 }
//             }

//             if (errors.length === 0) {
//                 return Result.ok(modelOut);
//             } else {
//                 return Result.error(errors);
//             }
//         }
//     );
// };


