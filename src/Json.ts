import { z } from 'zod';
import { Result } from './Result.ts';

export type JSONValue = 
    | string 
    | number 
    | boolean 
    | null 
    | JSONValue[] 
    | { [key: string]: JSONValue | undefined };

export const jsonParseRaw = (text: string): Result<JSONValue, string> => {
    try {
        const json = JSON.parse(text);
        return Result.ok(json);
    } catch (_error) {
        return Result.error(`Parsing error json data=${JSON.stringify(text, null, 4)}`);
    }
};

export const jsonParse = <T>(text: string, validator: z.ZodType<T>): Result<T, string> => {
    const json = jsonParseRaw(text);

    if (json.type === 'error') {
        return json;
    }

    const dataRaw: JSONValue = json.value;

    const data = validator.safeParse(dataRaw);

    if (data.success) {
        return Result.ok(data.data);
    }

    return Result.error(`Validation (zod) -> error=${data.error.toString()} data=${JSON.stringify(text, null, 4)}`);
};