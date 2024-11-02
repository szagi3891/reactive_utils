import { z } from 'zod';
import { Result } from './Result.ts';

export type JSONValue = 
    | string 
    | number 
    | boolean 
    | null 
    | JSONValue[] 
    | { [key: string]: JSONValue | undefined };

export const JSONValueZod: z.ZodType<JSONValue> = z.lazy(() =>
    z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.null(),
        z.array(JSONValueZod),
        z.record(JSONValueZod.or(z.undefined()))
    ])
);

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

const recursivelyOrderKeys = (unordered: JSONValue): JSONValue => {
    if (Array.isArray(unordered)) {
        return unordered.map(item => recursivelyOrderKeys(item));
    }

    if (unordered === null) {
        return unordered;
    }
  
    if (typeof unordered === 'object') {
        const ordered: Record<string, JSONValue | undefined> = {};
        
        Object.keys(unordered).sort().forEach((key) => {
            const value = unordered[key];
            ordered[key] = value === undefined ? undefined : recursivelyOrderKeys(value);
        });

        return ordered;
    }
  
    return unordered;
};

export const stringifySort = (value: JSONValue, format?: boolean): string => {

    try {
        if (format === true) {
            return JSON.stringify(recursivelyOrderKeys(value), null, 4);
        }

        return JSON.stringify(recursivelyOrderKeys(value));
    } catch (err) {
        console.trace('stringifySort', {value, format});
        throw err;
    }
};
