import { escapeParamShell } from "./escape.ts";

export class ShellEscapedString {
    protected nominal: 'nominal' = 'nominal' as const;
    constructor(public readonly value: string) {}

    toString() {
        return this.value;
    }
}

export const shellEscape = (
  strings: TemplateStringsArray,
  ...values: string[]
): ShellEscapedString => {
    const result: Array<string> = [];

    strings.forEach((part, i) => {
        result.push(part);

        if (i < values.length) {
            result.push(escapeParamShell(values[i]));
        }
    });

    return new ShellEscapedString(result.join(''));
};


