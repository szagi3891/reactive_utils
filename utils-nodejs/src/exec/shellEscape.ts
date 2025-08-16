import { escapeParamShell } from "./escape.ts";

export class ShellEscapedString {
    protected nominal: 'nominal' = 'nominal' as const;
    constructor(public readonly value: string) {}
}

export const shellEscape = (
  strings: TemplateStringsArray,
  ...values: string[]
): ShellEscapedString => {
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

    return new ShellEscapedString(result.join(''));
};


