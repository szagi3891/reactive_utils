import tsParser from "@typescript-eslint/parser";
// import importPlugin from 'eslint-plugin-import';

// import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

// import nextPlugin from '@next/eslint-plugin-next';
import reactPlugin from 'eslint-plugin-react';
// import hooksPlugin from 'eslint-plugin-react-hooks';
import hooksPlugin from 'eslint-plugin-react-hooks';

// import react from 'eslint-plugin-react';
// console.info(react.configs.recommended);

// console.info('react rules', {
//     ...reactPlugin.configs.recommended.rules,
//     ...reactPlugin.configs["jsx-runtime"].rules,
// });
// console.info('tseslint', tseslint);

// import { defineConfig } from 'eslint/config';
// export default defineConfig([

/**
 * Using
 * 
 * import { defineConfig } from 'eslint/config';
 * import { eslintConfig } from '@reactive/utils';
 * 
 * export default defineConfig([
 *     ...eslintConfig,
 * ]);
 * 
 */
export const eslintConfig = [
    eslint.configs.recommended,
    tseslint.configs.recommended,

    {
        plugins: {
            'react-hooks': hooksPlugin,
        },
        rules: {
            ...hooksPlugin.configs.recommended.rules,
        }
    },

    {
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 5,
            sourceType: "script",

            parserOptions: {
                project: "./tsconfig.json",
            },
        },
        rules: {

            "@typescript-eslint/no-namespace": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/prefer-as-const": "error",
            "@typescript-eslint/ban-ts-comment": "error",
            "@typescript-eslint/no-this-alias": "off",
            "@typescript-eslint/ban-types": "off",
            "@typescript-eslint/no-empty-object-type": "off",

            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/await-thenable": "error",
            "@typescript-eslint/no-floating-promises": "error",

            "@typescript-eslint/no-unsafe-function-type": "error",
            "@typescript-eslint/use-unknown-in-catch-callback-variable": "error",
            "@typescript-eslint/no-unsafe-assignment": "error",
            "@typescript-eslint/no-unsafe-member-access": "error",
            "@typescript-eslint/no-unsafe-call": "error",
            "@typescript-eslint/no-unsafe-return": "error",
            "@typescript-eslint/no-unsafe-argument": "error",
            "@typescript-eslint/no-unsafe-enum-comparison": "error",
            "@typescript-eslint/no-unsafe-declaration-merging": "error",

            "@typescript-eslint/no-unsafe-unary-minus": "error",
            "@typescript-eslint/no-unsafe-type-assertion": "error",
            "@typescript-eslint/no-unnecessary-condition": ["error", {
                "allowConstantLoopConditions": true
            }],
            "@typescript-eslint/strict-boolean-expressions": "error",
            "@typescript-eslint/no-non-null-assertion": "error",
            "@typescript-eslint/switch-exhaustiveness-check": "error",
            "@typescript-eslint/prefer-ts-expect-error": "error",
            "@typescript-eslint/prefer-string-starts-ends-with": "error",
            "@typescript-eslint/prefer-readonly": "error",
            "@typescript-eslint/prefer-nullish-coalescing": "error",
            "@typescript-eslint/restrict-template-expressions": "error",
            "@typescript-eslint/restrict-plus-operands": "error",

            "@typescript-eslint/consistent-type-imports": ["error", {
                "prefer": "type-imports",
                "disallowTypeAnnotations": false
            }]
        }
    },
    {
        plugins: {
            react: reactPlugin
        },
        rules: {
            ...reactPlugin.configs.recommended.rules,
            ...reactPlugin.configs["jsx-runtime"].rules,
        },

        //Detekcja wersji react
        settings: {
            react: {
                version: 'detect',
            },
            'import/resolver': {
                typescript: {
                    alwaysTryTypes: true,
                },
            },
        },
    },

    {
        rules: {
            "require-yield": "off",
            "no-constant-condition": "off",
            "no-empty": "off",
            "no-dupe-else-if": "off",
            "react/react-in-jsx-scope": "off",
            "react/no-unknown-property": "off",
            "react/jsx-no-target-blank": "off",
            "no-async-promise-executor": "off",
            "no-irregular-whitespace": "off",
            "no-unsafe-optional-chaining": ["error", {
                "disallowArithmeticOperators": true
            }],
            "no-unused-expressions": "error",
            "no-fallthrough": "error",
            "no-negated-condition": "error",
            "prefer-template": "error",
        },
    },
    
    //nadpisywane przez lokalną konfigurację
    {
        ignores: [
            "src/dist",
            "src_ssh/dist",
            "src_ssh2/src/dist"
        ]
    },
// ]);
];


/*
https://github.com/vercel/next.js/discussions/49337#discussioncomment-6009130

import nextPlugin from '@next/eslint-plugin-next';
import reactPlugin from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';


export default [
  {
    files: ['**\/*.ts', '**\/*.tsx'],
    plugins: {
      react: reactPlugin,
      'react-hooks': hooksPlugin,
      '@next/next': nextPlugin,
    },
    rules: {
      ...reactPlugin.configs['jsx-runtime'].rules,
      ...hooksPlugin.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      '@next/next/no-img-element': 'error',
    },
  },
  ... rest of your config
]

*/

