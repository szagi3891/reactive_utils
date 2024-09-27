import { expect, test } from 'vitest';
import { convertToNumber, convertToNumeric } from './validators';

test('validators', () => {
    expect(convertToNumber('oczekiwano liczby')('44')).toEqual({
        type: 'ok',
        value: 44
    });
});

test('', () => {
    expect(convertToNumeric('aa')).toEqual({
        type: 'error',
        error: 'Nieprawidłowy znak a'
    });

    expect(convertToNumeric('44')).toEqual({
        type: 'ok',
        value: '44'
    });

    expect(convertToNumeric('44,5')).toEqual({
        type: 'ok',
        value: '44.5'
    });

    expect(convertToNumeric('44,56')).toEqual({
        type: 'ok',
        value: '44.56'
    });

    expect(convertToNumeric('44.56.5')).toEqual({
        type: 'error',
        error: 'Zbyt duzo kropek',
    });
});
