import { expect } from "jsr:@std/expect";
import { validateRange, validateConvertToNumber } from "./validators.ts";
import { FormInputState } from "./FormInputState.ts";
import { FormModel } from "./FormModel.ts";
import { FormErrorMessage } from './FormTypes.ts';
import { Result } from '../Result.ts';

Deno.test('validateRange', () => {
    const fun = validateRange(1, 31, "aaa");

    expect(fun(0)).toEqual(Result.error('aaa'));
    expect(fun(1)).toEqual(Result.ok(1));
    expect(fun(2)).toEqual(Result.ok(2));
    expect(fun(20)).toEqual(Result.ok(20));
    expect(fun(30)).toEqual(Result.ok(30));
    expect(fun(31)).toEqual(Result.ok(31));
    expect(fun(32)).toEqual(Result.error('aaa'));
});

Deno.test('grupa', () => {
    const field1 = FormInputState.from(() => '')
        .map(validateConvertToNumber('Input1: Not number'))
        .map((value): Result<number, string> => {
            if (value > 10) {
                return Result.error('Input1: Za duża liczba');
            } else {
                return Result.ok(value);
            }
        });

    const field2 = FormInputState.from(() => '')
        .map(validateConvertToNumber('Input2: Not number'))
        .map((value): Result<number, string> => {
            if (value > 10) {
                return Result.error('Input2: Za duża liczba');
            } else {
                return Result.ok(value);
            }
        });

    const form =
        FormModel.group({
            field1: field1,
            field2: field2,
        })
        .map((value) => {
            if (value.field1 + value.field2 > 10) {
                return Result.error('Suma za duza');
            } else {
                return Result.ok(value);
            }
        });

    expect(form.errorForView).toEqual(null);

    field1.setAsVisited();
    field2.setAsVisited();

    expect(field1.value).toEqual('');
    expect(field2.value).toEqual('');

    expect(field1.errorForView).toEqual('Input1: Not number');
    expect(field2.errorForView).toEqual('Input2: Not number');
    expect(form.errorForView).toEqual(null);
    expect(form.result).toEqual({
        "type": "error",
        "error": [
            new FormErrorMessage([ "field1" ], true, "Input1: Not number"),
            new FormErrorMessage([ "field2" ], true, "Input2: Not number"),
        ]
    });

    field1.setValue('aa');

    expect(field1.value).toEqual('aa');
    expect(field2.value).toEqual('');
    expect(field1.errorForView).toEqual('Input1: Not number');
    expect(field2.errorForView).toEqual('Input2: Not number');
    expect(form.errorForView).toEqual(null);
    expect(form.result).toEqual({
        "type": "error",
        "error": [
            new FormErrorMessage([ "field1" ], true, "Input1: Not number"),
            new FormErrorMessage([ "field2" ], true, "Input2: Not number"),
        ]
    });

    field1.setValue('8');

    expect(field1.value).toEqual('8');
    expect(field2.value).toEqual('');
    expect(field1.errorForView).toEqual(null);
    expect(field2.errorForView).toEqual('Input2: Not number');
    expect(form.errorForView).toEqual(null);
    expect(form.result).toEqual({
        "type": "error",
        "error": [
            new FormErrorMessage(["field2"], true, "Input2: Not number"),
        ]
    });


    field1.setValue('11');

    expect(field1.value).toEqual('11');
    expect(field2.value).toEqual('');
    expect(field1.errorForView).toEqual('Input1: Za duża liczba');
    expect(field2.errorForView).toEqual('Input2: Not number');
    expect(form.errorForView).toEqual(null);
    expect(form.result).toEqual({
        "type": "error",
        "error": [
            new FormErrorMessage([ "field1" ], true, "Input1: Za duża liczba"),
            new FormErrorMessage([ "field2" ], true, "Input2: Not number")
        ]
    });


    field1.setValue('8');


    expect(field1.value).toEqual('8');
    expect(field2.value).toEqual('');
    expect(field1.errorForView).toEqual(null);
    expect(field2.errorForView).toEqual('Input2: Not number');
    expect(form.errorForView).toEqual(null);
    expect(form.result).toEqual({
        "type": "error",
        "error": [
            new FormErrorMessage([ "field2" ], true, "Input2: Not number"),
        ]
    });

    field2.setValue('1');

    expect(field1.value).toEqual('8');
    expect(field2.value).toEqual('1');
    expect(field1.errorForView).toEqual(null);
    expect(field2.errorForView).toEqual(null);
    expect(form.errorForView).toEqual(null);
    expect(form.result).toEqual(Result.ok({field1: 8, field2: 1}));
    expect(form.errorForView).toEqual(null);

    field2.setValue('3');

    expect(field1.value).toEqual('8');
    expect(field2.value).toEqual('3');
    expect(field1.errorForView).toEqual(null);
    expect(field2.errorForView).toEqual(null);
    expect(form.errorForView).toEqual("Suma za duza");
    expect(form.result).toEqual({
        "type": "error",
        "error": [
            new FormErrorMessage([], true, "Suma za duza"),
        ]
    });
    expect(form.errorForView).toEqual("Suma za duza");
});