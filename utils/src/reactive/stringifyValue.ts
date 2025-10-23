const objectToIdMap = new WeakMap<object, string>();
let nextId = 1;

export function getObjectId(obj: object): string {
    let id = objectToIdMap.get(obj);
    if (id === undefined) {
        id = `obj-${nextId++}`;
        objectToIdMap.set(obj, id);
    }
    return id;
}

// Handle basic POJOs and arrays recursively
function isPOJO(obj: object): boolean {
    return Object.getPrototypeOf(obj) === Object.prototype;
}

function isPlainArray(arr: unknown): arr is unknown[] {
    return Array.isArray(arr);
}

export function stringifyValue(value: unknown): string {
    if (value === null) return 'null';

    switch (typeof value) {
        case 'undefined': {
            return 'val-undefined'
        }

        case 'number':
        case 'boolean':
        case 'string':
            return `val-${String(value)}`;

        case 'bigint':
            return `val-${value.toString()}`;

        case 'symbol':
            return `val-${String(value)}`;

        case 'object': {
            if (value instanceof Date) {
                return `val-${value.toISOString()}`;
            }
            if (isPlainArray(value)) {
                return `val-[${value.map(stringifyValue).join(',')}]`;
            }
            if (isPOJO(value)) {
                const symbols = Object.getOwnPropertySymbols(value);

                if (symbols.length > 0) {
                    throw Error('Nie obsługujemy symboli');
                }

                const entries = [...Object.entries(value)]
                    .sort(([a], [b]) => (String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0));

                return `val-{ ${entries.map(([k, v]) => `${String(k)}: ${stringifyValue(v)}`).join(', ')} }`;
            }

            return getObjectId(value);
        }

        case 'function':
            return getObjectId(value);

        default:
            console.info('value', value);
            throw Error('Unknown type');
    }
}
