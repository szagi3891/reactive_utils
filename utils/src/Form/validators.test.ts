import { expect } from "jsr:@std/expect";
import { validateConvertToNumber, validateConvertToNumeric } from './validators.ts';

Deno.test('validators', () => {
    expect(validateConvertToNumber('oczekiwano liczby')('44')).toEqual({
        type: 'ok',
        data: 44
    });
});

Deno.test('validators2', () => {
    expect(validateConvertToNumeric('aa')).toEqual({
        type: 'error',
        error: 'Nieprawidłowy znak a'
    });

    expect(validateConvertToNumeric('44')).toEqual({
        type: 'ok',
        data: '44'
    });

    expect(validateConvertToNumeric('44,5')).toEqual({
        type: 'ok',
        data: '44.5'
    });

    expect(validateConvertToNumeric('44,56')).toEqual({
        type: 'ok',
        data: '44.56'
    });

    expect(validateConvertToNumeric('44.56.5')).toEqual({
        type: 'error',
        error: 'Zbyt duzo kropek',
    });
});
