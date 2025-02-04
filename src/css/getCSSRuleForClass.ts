import { CssRuleType, parseCss } from "./cssParse.ts";

const getRules = (rule: CSSRule, result: Map<string, Array<string>>) => {
    if (rule instanceof CSSPropertyRule) {
        return;
    }

    if (rule instanceof CSSKeyframesRule) {
        return null;
    }

    if (rule instanceof CSSLayerStatementRule) {
        return null;
    }

    if (rule instanceof CSSLayerBlockRule) {
        //Tylko utilitis bierzemy

        if (rule.name === 'utilities') {
            for (const subRule of Array.from(rule.cssRules)) {
                getRules(subRule, result);
            }
        }
        return;
    }

    if (rule instanceof CSSStyleRule) {
        const list = result.get(rule.selectorText);
        if (list !== undefined) {
            list.push(rule.cssText);
        }

        result.set(rule.selectorText, [rule.cssText]);
        return;
    }

    console.info('unknown class', rule);
};

export const getCSSRuleForClass = (): Map<string, Array<string>> | null => {
    const result = new Map<string, Array<string>>();

    if (typeof document === 'undefined') {
        return null;
    }

    for (const stylesheet of Array.from(document.styleSheets)) {
        for (const rule of Array.from(stylesheet.cssRules)) {
            getRules(rule, result);
        }
    }

    return result;
}

const createProperties = (
    prefix: Array<string>,
    css: Array<[string, string] | CssRuleType>,
    result: Array<[string, string]>
) => {
    for (const cssItem of css) {
        if (Array.isArray(cssItem)) {
            result.push([
                [...prefix, cssItem[0]].join(' '),
                cssItem[1],
            ]);
        } else {
            createProperties(
                [...prefix, cssItem.selector],
                cssItem.rules,
                result
            );
        }
    }
};

const getProperty = (cssDefinition: string): Array<[string, string]> => {
    const result = parseCss(cssDefinition);
    
    if (result === null) {
        throw Error(`parseCss error ${cssDefinition}`);
    }

    const properties: Array<[string, string]> = [];
    createProperties([], result.rules, properties);

    return properties;
};

const getCssProperties = (cssDefinitions: Array<string>): [Map<string, string>, boolean] => {
    const result: Map<string, string> = new Map();
    let error = false;

    for (const css of cssDefinitions) {
        for (const [name, value] of getProperty(css)) {
            if (result.has(name)) {
                error = true;
            }

            result.set(name, value);
        }
    }

    return [result, error];
}

export const getCssPropertiesForClasses = (): Map<string, Map<string, string>> | null => {
    const css = getCSSRuleForClass();

    if (css === null) {
        return null;
    }

    const result:  Map<string, Map<string, string>> = new Map();

    for (const [className, cssDefinitions] of css.entries()) {
        const [cssProps, error] = getCssProperties(cssDefinitions);
        if (error) {
            console.error('Conflicting css definitions', JSON.stringify({
                className,
                cssDefinitions
            }, null, 4));
        }

        result.set(className, cssProps);
    }

    return result;
};

