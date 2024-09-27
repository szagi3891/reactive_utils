import { expect, test } from 'vitest';
import { validateConvertToNumber, validateConvertToNumeric } from './validators';

test('validators', () => {
    expect(validateConvertToNumber('oczekiwano liczby')('44')).toEqual({
        type: 'ok',
        value: 44
    });
});

test('', () => {
    expect(validateConvertToNumeric('aa')).toEqual({
        type: 'error',
        error: 'Nieprawidłowy znak a'
    });

    expect(validateConvertToNumeric('44')).toEqual({
        type: 'ok',
        value: '44'
    });

    expect(validateConvertToNumeric('44,5')).toEqual({
        type: 'ok',
        value: '44.5'
    });

    expect(validateConvertToNumeric('44,56')).toEqual({
        type: 'ok',
        value: '44.56'
    });

    expect(validateConvertToNumeric('44.56.5')).toEqual({
        type: 'error',
        error: 'Zbyt duzo kropek',
    });
});
