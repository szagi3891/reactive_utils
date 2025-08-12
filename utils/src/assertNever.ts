
export const assertNever = (value: never): never => {
    console.error(value);
    throw Error('assert never');
}