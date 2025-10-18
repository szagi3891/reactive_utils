import { expect } from "jsr:@std/expect";
import { FormInputState } from './FormInputState.ts';
import { FormErrorMessage } from './FormTypes.ts';
import { Result } from '../Result.ts';

const errorMessage = 'Przynajmnie dwa znaki wprowadz';
const createError = (): Result<string, string> => Result.error(errorMessage);

Deno.test('Visited', () => {
    const field = FormInputState.from(() => '').map((value: string): Result<string, string> => {
        if (value.length < 2) {
            return createError();
        }
        
        return Result.ok(value);
    });

    expect(field.result).toEqual({
        "type": "error",
        "error": [
            new FormErrorMessage([], false, "Przynajmnie dwa znaki wprowadz"),
        ]
    });
    expect(field.errorForView).toEqual(null);

    field.setAsVisited();

    expect(field.result).toEqual({
        "type": "error",
        "error": [
            new FormErrorMessage([], true, "Przynajmnie dwa znaki wprowadz"),
        ]
    });
    expect(field.errorForView).toEqual(errorMessage);

    field.setValue('a');
    expect(field.result).toEqual({
        "type": "error",
        "error": [
            new FormErrorMessage([], true, "Przynajmnie dwa znaki wprowadz"),
        ]
    });
    expect(field.errorForView).toEqual(errorMessage);

    field.setValue('aa');
    expect(field.result).toEqual(Result.ok('aa'));
    expect(field.errorForView).toEqual(null);
});
