// export const shellEscape = (strings: TemplateStringsArray, ...values: string[]): EscapeString => {
//     const result: Array<EscapeStringConstType | EscapeStringParamType> = [];

import { escapeParamShell } from "./escape.ts";

//     strings.forEach((part, i) => {
//         result.push({
//             type: 'const',
//             value: part
//         });

//         if (i < values.length) {
//             const val = values[i];
//             if (val === undefined) {
//                 throw Error('Expected value');
//             }
//             result.push({
//                 type: 'escaped',
//                 value: val
//             });
//         }
//     });

//     return EscapeString.fromArray(result);
// };

interface EscapeStringConstType {
    type: 'const',
    value: string,
}

interface EscapeStringParamType {
    type: 'escaped',
    value: string,
}

export class EscapeString {

    private constructor(
        private readonly data: EscapeStringConstType | EscapeStringParamType,
    ) {}

    public static fromArray(data: EscapeStringConstType | EscapeStringParamType): EscapeString {
        return new EscapeString(data);
    }

    public static fromConst(param: string): EscapeString {
        return new EscapeString({
            type: 'const',
            value: param,
        });
    }

    public static escape(param: string): EscapeString {
        return new EscapeString({
            type: 'escaped',
            value: param,
        });
    }

    getResultString(): string {
        const result: Array<string> = [];

        // for (const item of this.data) {
            switch (this.data.type) {
                case 'const': {
                    return this.data.value;
                    // continue;
                }
                case 'escaped': {
                    return escapeParamShell(this.data.value);
                    // continue;
                }
            }
        // }

        return result.join('');
    }
}
