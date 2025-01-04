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
    errors: Array<FormatZodErrorsType>,
    data: unknown,
}

export const checkByZod = <T>(validator: z.ZodType<T>, data: unknown): Result<T, CheckByZodResult> => {
    const safeData = validator.safeParse(data);
    if (safeData.success) {
        return Result.ok(safeData.data);
    }

    return Result.error({
        errors: formatZodErrors(safeData.error),
        data,
    });
}
