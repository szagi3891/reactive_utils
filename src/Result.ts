export class ResultError<E> {
    constructor(
        public readonly type: 'error',
        public readonly error: E
    ) {}

    map(_mapFun: (value: unknown) => unknown): ResultError<E> {
        return this;
    }
}

export class ResultOk<T> {
    constructor(
        public readonly type: 'ok',
        public readonly data: T,
    ) {}

    map<T2>(mapData: (value: T) => T2): ResultOk<T2> {
        return new ResultOk(
            'ok',
            mapData(this.data)
        );
    }
}

export type Result<T, E> = ResultOk<T> | ResultError<E>;

export const Result = {
    ok: <T>(data: T): Result<T, never> => {
        return new ResultOk(
            'ok',
            data
        );
    },
  
    error: <E>(error: E): Result<never, E> => {
        return new ResultError(
            'error',
            error
        );
    }
}


//TODO - sprawdzić mapowanie result<T1, E> na Result<T2, E>

// const fun1 = (): Result<number, number> => {
//     throw Error('TODO');
// };

// const rrr = (): Result<string, number> => {

//     //: Result<string, number>
//     const ggg = fun1().map(() => '');

//     return ggg;
// }

// console.info(rrr);