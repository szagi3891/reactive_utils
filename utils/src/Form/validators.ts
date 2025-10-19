import { Result } from '../Result.ts';

const parseNumber = (input: string): number | null => {
    // Próbujemy sparsować ciąg do liczby
    const parsed = Number(input);

    // Sprawdzamy, czy wynik parsowania to NaN (nie jest liczbą)
    // Lub czy ciąg wejściowy nie jest identyczny z parsowaną liczbą (uwzględniając białe znaki)
    if (isNaN(parsed) || input.trim() !== parsed.toString()) {
        return null;
    }

    return parsed;
}

export const validateConvertToNumeric = (value: string): Result<string, string> => {
    const newValue = value.replaceAll(',', '.');

    let dots = 0;

    for (const char of newValue) {
        if (char === '.') {
            dots += 1;
        } else if (
            char === '0' ||
            char === '1' ||
            char === '2' ||
            char === '3' ||
            char === '4' ||
            char === '5' ||
            char === '6' ||
            char === '7' ||
            char === '8' ||
            char === '9'
        ) {
            //ok
        } else {
            return Result.error(`Nieprawidłowy znak ${char}`);
        }
    }

    if (dots > 1) {
        return Result.error('Zbyt duzo kropek');
    }

    return Result.ok(newValue);
};

export const validateConvertToNumber = (message: string) => (value: string): Result<number, string> => {
    const valueNumber = parseNumber(value);
    return valueNumber === null ? Result.error(message) : Result.ok(valueNumber);
}

export const validateNotEmpty = (message: string) => (value: string): Result<string, string> => {
    const valueTrim = value.trim();
    return valueTrim === '' ? Result.error(message) : Result.ok(valueTrim)
};

export const validateRange = (from: number, to: number, message: string) => (value: number): Result<number, string> =>
    from <= value && value <= to ? Result.ok(value) : Result.error(message)
;

export const validateNotNull = <T>(value: T | null): Result<T, string> => {
    if (value === null) {
        return Result.error(`Uzupełnij pole`);
    } else {
        return Result.ok(value);
    }
}

export const validateMinLength = (minLength: number) => (value: string): Result<string, string> => {
    if (value.length < minLength) {
        return Result.error(`Oczekiwano przynajmniej ${minLength} znaków`);
    }

    return Result.ok(value);
};

export const validateEmail = (value: string): Result<string, string> => {
    const [first, second, ...rest] = value.split('@');

    if (rest.length > 0) {
        return Result.error('Oczekiwano maksymalnie jednego znaku @');
    }

    if (first === undefined || second === undefined) {
        return Result.error('Poprawny email powinien zawierać znak @');
    }

    if (second.includes('.')) {
        return Result.ok(value);
    }

    return Result.error('Oczekiwano formatu xxx@yyy.zzz');
};
