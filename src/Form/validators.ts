import { Temporal } from "@js-temporal/polyfill";
import { Result } from '../Result';

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

export const convertToNumeric = (value: string): Result<string, string> => {
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

export const convertToNumber = (message: string) => (value: string): Result<number, string> => {
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

export const validateTemporalPlainDate = (value: string): Result<Temporal.PlainDate | null, string> => {
    const valueTrim = value.trim();
    if (valueTrim === '') {
        return Result.ok(null);
    }

    try {
        const date = Temporal.PlainDate.from(valueTrim);
        return Result.ok(date);
    } catch (error) {
        return Result.error(`Bład pocczas konwersji na Temporal.PlainDate, wejściowy tekst ${value}`);
    }
}
export const validateNotNull = <T>(value: T | null): Result<T, string> => {
    if (value === null) {
        return Result.error(`Uzupełnij pole`);
    } else {
        return Result.ok(value);
    }
}