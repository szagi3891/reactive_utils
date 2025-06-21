import { Result } from "./Result.ts";

const errorToString = (error: unknown): string => {
    try {
        //@ts-expect-error dddd
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        return [error.toString(), '', error.stack].join('\n');
    } catch (error) {
        return String(error);
    }
}

export const tryFn = async <T>(fn: () => Promise<T>): Promise<Result<T, string>> => {
    try {
        const value = await fn();
        return Result.ok(value);
    } catch (error) {
        return Result.error(errorToString(error));
    }
};
