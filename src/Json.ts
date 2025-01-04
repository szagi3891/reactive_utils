import { z } from 'zod';

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
