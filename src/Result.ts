export interface ResultError<E> {
    readonly type: 'error';
    readonly error: E
}

export interface ResultOk<T> {
    readonly type: 'ok';
    readonly value: T;
}

export type Result<T, E> = ResultOk<T> | ResultError<E>;

export namespace Result {
    export const ok = <T>(value: T): Result<T, never> => {
        return {
            type: 'ok',
            value
        };
    }
  
    export const error = <E>(error: E): Result<never, E> => {
        return {
            type: 'error',
            error
        }
    }
}
