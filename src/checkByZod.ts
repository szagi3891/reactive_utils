import { z } from "zod";
import { Result, stringifySort, type JSONValue } from '@reactive/utils';

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
export class CheckByZodError {

    constructor(
        public readonly description: string | Array<string>,
        public readonly errors: Array<FormatZodErrorsType>,
        public readonly data: unknown,
    ) {}

    stringifySort(): string {
        //@ts-expect-error - assumption that they are compatible
        const data: JSONValue = this.data;

        return stringifySort({
            description: this.description,
            errors: this.errors.map(item => ({...item})),
            data,
        }, true)
    }

    public addDescription(message: string): CheckByZodError {
        const description: Array<string> = Array.isArray(this.description) ? this.description : [this.description];

        return new CheckByZodError(
            [
                message,
                ...description,
            ],
            this.errors,
            this.data
        );
    }
}

export class CheckByZod<T> {
    private constructor(
        private readonly description: string,
        private readonly safeParse: (data: unknown) => { 
            success: true, 
            data: T
        } | {
            success: false,
            error: Array<FormatZodErrorsType>
        },
    ) {}

    public static create<T0, T>(description: string, schema: z.ZodType<T0, z.ZodTypeDef, T>): CheckByZod<T0> {
        return new CheckByZod(
            description,
            (data: unknown) => {

                const safeeData = schema.safeParse(data);

                if (safeeData.success) {
                    return {
                        success: true,
                        data: safeeData.data,
                    }
                }

                return {
                    success: false,
                    error: formatZodErrors(safeeData.error),
                }
            }
        )
    }

    check = (data: unknown): Result<T, CheckByZodError> => {
        const safeData = this.safeParse(data);
        if (safeData.success) {
            return Result.ok(safeData.data);
        }
    
        return Result.error(new CheckByZodError(
            `CheckByZod: ${this.description}`,
            safeData.error,
            data,
        ));
    }

    jsonParse = (text: string): Result<T, CheckByZodError> => {
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
            return Result.error(new CheckByZodError(
                `CheckByZod: ${this.description}`,
                [{
                    field: '---',
                    message: 'jsonParse: Parsing error',
                }],
                text,
            ));
        }
    
        const dataRaw: JSONValue = json.data;
    
        return this.check(dataRaw);
    }

    jsonParseUnknown = (data: unknown): Result<T, CheckByZodError> => {
        if (typeof data !== 'string') {
            return Result.error(new CheckByZodError(
                `CheckByZod: ${this.description}`,
                [{
                    field: '---',
                    message: `jsonParseUnknown: expected string, received ${typeof data}`,
                }],
                data,
            ));
        }

        return this.jsonParse(data);
    }
}

