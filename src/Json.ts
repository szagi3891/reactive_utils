import { z } from 'zod';
import { Result } from './Result.ts';

export type JSONValue = 
    | string 
    | number 
    | boolean 
    | null 
    | JSONValue[] 
    | { [key: string]: JSONValue };


export const jsonParse = <T>(text: string, validator: z.ZodType<T>): Result<T, string> => {    
    try {
        const json = JSON.parse(text);
        const data = validator.safeParse(json);

        if (data.success) {
            return Result.ok(data.data);
        }

        return Result.error(`Validation (zod) -> error=${data.error.toString()} data=${JSON.stringify(text, null, 4)}`);
    } catch (_error) {
        return Result.error(`Parsing error json data=${JSON.stringify(text, null, 4)}`);
    }
};