import { Result } from "./Result.ts";

export const jsonParse = (data: string): Result<unknown, string> => {

    try {
        return Result.ok(JSON.parse(data));
    } catch (error) {
        return Result.error(String(error));
    }
};

