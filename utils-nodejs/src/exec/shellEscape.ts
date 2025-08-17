import { escapeParamShell } from "./escape.ts";

export const shellEscape = (strings: TemplateStringsArray, ...values: string[]): string => {
    const result: Array<string> = [];

    strings.forEach((part, i) => {
        result.push(part);

        if (i < values.length) {
            const val = values[i];
            if (val === undefined) {
                throw Error('Expected value');
            }
            result.push(escapeParamShell(val));
        }
    });

    return result.join('');
};


