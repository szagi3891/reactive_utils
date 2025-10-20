
export const typedEntries2 = <T extends Record<string, unknown>>(
    obj: T,
    callback: <K extends keyof T>(key: string, value: T[K]) => void
): void => {
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            callback(key, obj[key]);
        }
    }
}
