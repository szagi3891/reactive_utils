import z from "zod";
import { Result } from "./Result.ts";

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
interface CheckByZodResult {
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
            errors: formatZodErrors(safeData.error),
            data,
            description: this.description,
        });
    }
}
