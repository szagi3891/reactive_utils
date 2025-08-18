export const shellEscape = (strings: TemplateStringsArray, ...values: string[]): EscapeString => {
    const result: Array<EscapeStringConstType | EscapeStringParamType> = [];

    strings.forEach((part, i) => {
        result.push({
            type: 'const',
            value: part
        });

        if (i < values.length) {
            const val = values[i];
            if (val === undefined) {
                throw Error('Expected value');
            }
            result.push({
                type: 'escaped',
                value: val
            });
        }
    });

    return EscapeString.fromArray(result);
};

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
        private readonly data: Array<EscapeStringConstType | EscapeStringParamType>
    ) {}

    public static fromArray(data: Array<EscapeStringConstType | EscapeStringParamType>): EscapeString {
        return new EscapeString(data);
    }

    public static fromConst(param: string): EscapeString {
        return new EscapeString([{
            type: 'const',
            value: param,
        }]);
    }

    getResultString(escape: (param: string) => string): string {
        const result: Array<string> = [];

        for (const item of this.data) {
            switch (item.type) {
                case 'const': {
                    result.push(item.value);
                    continue;
                }
                case 'escaped': {
                    result.push(escape(item.value));
                    continue;
                }
            }
        }

        return result.join('');
    }
}
