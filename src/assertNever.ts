
export const assertNever = (lebel: string, value: never): never => {
    console.error(value);
    throw Error(`assert never: ${lebel}`);
}