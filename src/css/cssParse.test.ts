import { expect } from "jsr:@std/expect";
import { getChar, getCssRule, getCssRules, getSelektor, matchClose, parseCssRule, trimWhitespace } from './cssParse.ts';

Deno.test('getChar', () => {
    expect(getChar('{ dddd }'.split(''), '{')).toEqual(' dddd }'.split(''));
    expect(getChar('dddd }'.split(''), '{')).toEqual(null);
})

Deno.test('geetSelektor', () => {
    expect(getSelektor('.space-y-1 { dddd }'.split('')))
        .toEqual(['.space-y-1', '{ dddd }'.split('')]);

    expect(getSelektor('{ dddd }'.split('')))
        .toEqual(null);
});

Deno.test('geetCssRule', () => {
    expect(getCssRule('--tw-space-x-reverse: 0; margin-inline-start: calc(4px * var(--tw-space-x-reverse));'.split('')))
        .toEqual(['--tw-space-x-reverse: 0', ' margin-inline-start: calc(4px * var(--tw-space-x-reverse));'.split('')]);
});

Deno.test('getCssRules', () => {
    expect(getCssRules('--tw-space-x-reverse: 0; margin-inline-start: calc(4px * var(--tw-space-x-reverse));'.split('')))
        .toEqual([['--tw-space-x-reverse: 0', 'margin-inline-start: calc(4px * var(--tw-space-x-reverse))'], []]);

    expect(getCssRules('  --tw-space-x-reverse: 0   ;     margin-inline-start: calc(4px * var(--tw-space-x-reverse))  ;   '.split('')))
        .toEqual([['--tw-space-x-reverse: 0', 'margin-inline-start: calc(4px * var(--tw-space-x-reverse))'], [' ', ' ', ' ']]);

        expect(
            getCssRules('  --tw-space-x-reverse: 0   ;     margin-inline-start: calc(4px * var(--tw-space-x-reverse))  ;   }  '.split(''))
        )
        .toEqual([
            ['--tw-space-x-reverse: 0', 'margin-inline-start: calc(4px * var(--tw-space-x-reverse))'],
            '   }  '.split(''),
        ]);
});

Deno.test('trimWhitespace', () => {
    expect(trimWhitespace(`
           
        } ddd`.split(''))).toEqual('} ddd'.split(''));
});

Deno.test('matchClose', () => {
    expect(matchClose(`
           
        } ddd`.split(''))).toEqual(' ddd'.split(''));
});

Deno.test('parseCss', () => {
    expect(parseCssRule(`
        :where(& > :not(:last-child)) { 
            --tw-space-y-reverse: 0; 
            margin-block-start: calc(calc(var(--spacing) * 1) * var(--tw-space-y-reverse)); 
            margin-block-end: calc(calc(var(--spacing) * 1) * calc(1 - var(--tw-space-y-reverse))); 
        } `.split('')))
    .toEqual([
        {
            "selector": ":where(& > :not(:last-child))",
            "rules": [
              [
                "--tw-space-y-reverse",
                "0",
              ],
              [
                "margin-block-start",
                "calc(calc(var(--spacing) * 1) * var(--tw-space-y-reverse))",
              ],
              [
                "margin-block-end",
                "calc(calc(var(--spacing) * 1) * calc(1 - var(--tw-space-y-reverse)))",
              ],
            ],
        },
        ' '.split('')
    ]);

    expect(parseCssRule(`
        .space-y-1 {
            :where(& > :not(:last-child)) { 
                --tw-space-y-reverse: 0; 
                margin-block-start: calc(calc(var(--spacing) * 1) * var(--tw-space-y-reverse)); 
                margin-block-end: calc(calc(var(--spacing) * 1) * calc(1 - var(--tw-space-y-reverse))); 
            }
        }  `.split('')))
    .toEqual([
        {
            "selector": ".space-y-1",
            "rules": [
                {
                    "selector": ":where(& > :not(:last-child))",
                    "rules": [
                    [
                        "--tw-space-y-reverse",
                        "0",
                    ],
                    [
                        "margin-block-start",
                        "calc(calc(var(--spacing) * 1) * var(--tw-space-y-reverse))",
                    ],
                    [
                        "margin-block-end",
                        "calc(calc(var(--spacing) * 1) * calc(1 - var(--tw-space-y-reverse)))",
                    ],
                    ],
                },
            ]
        }
    , '  '.split('')]);
});

Deno.test('basic', () => {
    const params: Array<string> = [
        '.inset-0 { inset: calc(var(--spacing) * 0); }',
        '.-translate-x-1\\/2 { --tw-translate-x: calc(calc(1/2 * 100%) * -1); translate: var(--tw-translate-x) var(--tw-translate-y); }',
        `.space-y-1 {
            :where(& > :not(:last-child)) { 
                --tw-space-y-reverse: 0; 
                margin-block-start: calc(calc(var(--spacing) * 1) * var(--tw-space-y-reverse)); 
                margin-block-end: calc(calc(var(--spacing) * 1) * calc(1 - var(--tw-space-y-reverse))); 
            }
        }`,
        `.border-black\\/25 { border-color: color-mix(in oklab, var(--color-black) 25%, transparent); }`,
        `.outline-hidden {
            outline-style: none;
            @media (forced-colors: active) {
                outline: transparent solid 2px;
                outline-offset: 2px;
            }
        }`,
        `
        .space-x-\\[4px\\] {
            :where(& > :not(:last-child)) {
                --tw-space-x-reverse: 0;
                margin-inline-start: calc(4px * var(--tw-space-x-reverse));
                margin-inline-end: calc(4px * calc(1 - var(--tw-space-x-reverse)));
            }
        }`,
        `
        .container {
            width: 100%;
            @media (width >= 40rem) {
                max-width: 40rem;
            }
            @media (width >= 48rem) {
                max-width: 48rem;
            }
            @media (width >= 64rem) {
                max-width: 64rem;
            }
            @media (width >= 80rem) {
                max-width: 80rem;
            }
            @media (width >= 96rem) {
                max-width: 96rem;
            }
        }
        `
    ];


    expect(params).toEqual(params);
});
