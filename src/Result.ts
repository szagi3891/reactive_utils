export interface ResultError<E> {
    readonly type: 'error';
    readonly error: E
}

export interface ResultOk<T> {
    readonly type: 'ok';
    readonly data: T;
}

export type Result<T, E> = ResultOk<T> | ResultError<E>;

export namespace Result {
    export const ok = <T>(data: T): Result<T, never> => {
        return {
            type: 'ok',
            data
        };
    }
  
    export const error = <E>(error: E): Result<never, E> => {
        return {
            type: 'error',
            error
        }
    }
}
