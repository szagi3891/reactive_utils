import z from "zod";
import { Result } from "./Result.ts";
import { JSONValue } from "./Json.ts";

interface FormatZodErrorsType {
    field: string;
    message: string;
}

const formatZodErrors = (error: z.ZodError): Array<FormatZodErrorsType> => {
    return error.errors.map((err) => {        
        return ({
            field: err.path.join("."),
            message: err.message,
        });
    });
};
export interface CheckByZodResult {
    description: string,
    errors: Array<FormatZodErrorsType>,
    data: unknown,
}

export class CheckByZod<T> {
    constructor(private readonly description: string, private readonly validator: z.ZodType<T>) {}

    check = (data: unknown): Result<T, CheckByZodResult> => {
        const safeData = this.validator.safeParse(data);
        if (safeData.success) {
            return Result.ok(safeData.data);
        }
    
        return Result.error({
            description: `CheckByZod: ${this.description}`,
            errors: formatZodErrors(safeData.error),
            data,
        });
    }

    jsonParse = (text: string): Result<T, CheckByZodResult> => {
        const jsonParseRaw = (text: string): Result<JSONValue, null> => {
            try {
                const json = JSON.parse(text);
                return Result.ok(json);
            } catch (_error) {
                return Result.error(null);
            }
        };
        
        const json = jsonParseRaw(text);
    
        if (json.type === 'error') {
            const result: CheckByZodResult = {
                description: `CheckByZod: ${this.description}`,
                errors: [{
                    field: '---',
                    message: 'Json: Parsing error',
                }],
                data: text,
            };

            return Result.error(result);
        }
    
        const dataRaw: JSONValue = json.value;
    
        return this.check(dataRaw);
    }
}

