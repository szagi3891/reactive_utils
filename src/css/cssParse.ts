


export const getChar = (textIn: Array<string>, char: string): Array<string> | null => {
    const [first, ...rest] = textIn;

    if (first === undefined) {
        return null;
    }

    if (first === char) {
        return rest;
    }

    return null;
}

export const trimWhitespace = (textIn: Array<string>): Array<string> => {
    let matchWhite = true;
    const result = [];

    for (const char of textIn) {
        if (matchWhite) {
            if (char === ' ' || char === '\n' || char === '\r' || char === '\t') {
                //ignore char
            } else {
                matchWhite = false;
                result.push(char);
                continue;
            }
        } else {
            result.push(char);
        }
    }

    return result;
};

//Pbiera tekst, do momentu wystąpienia znaku { , nie może wystąpić po drodze żaden znak } lub ;
export const getSelektor = (textIn: Array<string>): [string, Array<string>] | null => {
    let matchSelektor: boolean = true;

    const selektor = [];
    const rest = [];

    for (const char of textIn) {
        if (matchSelektor) {
            if (char === '{') {
                matchSelektor = false;
                rest.push(char);
                continue;
            }

            if (char === ';' || char === '}') {
                return null;
            }

            selektor.push(char);
        } else {
            rest.push(char);
        }
    }
    
    const selektorStr = selektor.join('').trim();

    if (selektorStr === '') {
        return null;
    }

    return [selektorStr, rest];
}

export const getCssRule = (textIn: Array<string>): [string, Array<string>] | null => {
    let matchRule: boolean = true;

    const rule = [];
    const rest = [];

    for (const char of textIn) {
        if (matchRule) {
            if (char === '{' || char === '}') {
                return null;
            }

            if (char === ';') {
                matchRule = false;
                continue;
            }
            rule.push(char);
        } else {
            rest.push(char);
        }
    }

    const ruleResult = rule.join('').trim();

    if (ruleResult.trim() === '') {
        return null;
    }

    return [
        ruleResult,
        rest
    ]
};

export const getCssRules = (textIn: Array<string>): [Array<string>, Array<string>] | null => {
    let testInWsk = textIn;
    const result = [];

    let cssRule: [string, Array<string>] | null;

    while ((cssRule = getCssRule(testInWsk)) !== null) {
        const [rule, rest] = cssRule;
        result.push(rule);
        testInWsk = rest;
    }

    if (result.length === 0) {
        return null;
    }

    return [ result, testInWsk ];
};

export interface CssRuleType {
    selector: string,
    rules: Array<[string, string] | CssRuleType>
}

const createRulr = (line: string): [string, string] => {
    const [prop, value, ...rest] = line.split(':');

    if (prop === undefined || value === undefined || rest.length > 0) {
        throw Error('Problem z przetworzeniem tej reguły');
    }

    return [prop.trim(), value.trim()];
}

export const matchClose = (textIn: Array<string>): Array<string> | null => {
    const beforeClose = trimWhitespace(textIn);
    const closeBracket = getChar(beforeClose, '}');

    return closeBracket;
}

export const parseCssRule = (textIn: Array<string>): [CssRuleType, Array<string>] | null => {

    const selektorParse = getSelektor(textIn);
    if (selektorParse === null) {
        return null;
    }

    const charResult = getChar(selektorParse[1], '{');
    if (charResult === null) {
        return null;
    }

    const result: Array<[string, string] | CssRuleType> = [];

    let current = charResult;

    while (true) {
        const parseCssRuleReesult = getCssRule(current);
        if (parseCssRuleReesult !== null) {
            result.push(createRulr(parseCssRuleReesult[0]));
            current = parseCssRuleReesult[1];
            continue;
        }

        const resutlParseCss = parseCssRule(current);
        if (resutlParseCss !== null) {
            result.push(resutlParseCss[0]);
            current = resutlParseCss[1];
            continue;
        }

        break;
    }

    const closeBracket = matchClose(current);

    if (closeBracket === null) {
        return null;
    }

    return [{
        selector: selektorParse[0].trim(),
        rules: result
    }, closeBracket];
}

export const parseCss = (text: string): CssRuleType | null => {
    const result = parseCssRule(text.split(''));

    if (result === null) {
        return null;
    }

    const [rule, rest] = result;
    if (rest.join('').trim() === '') {
        return rule;
    }

    return null;
}