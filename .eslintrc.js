// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

module.exports = {
    env: {
        browser: true,
        es6: true,
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: 'tsconfig.json',
        sourceType: 'module',
    },
    plugins: [
        'eslint-plugin-import',
        'eslint-plugin-jsdoc',
        'eslint-plugin-prefer-arrow',
        '@typescript-eslint',
        '@typescript-eslint/tslint',
        'sort-class-members',
        'jest',
        'security',
        'header',
        'check-file',
    ],
    ignorePatterns: ['**/dist/*', '**/node_modules/*'],
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:security/recommended-legacy'],
    rules: {
        '@typescript-eslint/array-type': [
            'error',
            {
                default: 'array',
            },
        ],
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/consistent-type-assertions': 'off',
        '@typescript-eslint/consistent-type-definitions': 'off',
        '@typescript-eslint/dot-notation': 'error',
        '@typescript-eslint/explicit-member-accessibility': [
            'error',
            {
                accessibility: 'explicit',
                overrides: {
                    constructors: 'off',
                },
            },
        ],
        '@typescript-eslint/indent': 'off',
        '@typescript-eslint/member-delimiter-style': [
            'error',
            {
                multiline: {
                    delimiter: 'semi',
                    requireLast: true,
                },
                singleline: {
                    delimiter: 'semi',
                    requireLast: false,
                },
            },
        ],
        '@typescript-eslint/naming-convention': 'off',
        '@typescript-eslint/no-extraneous-class': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-inferrable-types': 'off',
        '@typescript-eslint/no-namespace': 'off',
        '@typescript-eslint/no-parameter-properties': 'off',
        '@typescript-eslint/no-redeclare': 'error',
        '@typescript-eslint/no-require-imports': 'error',
        '@typescript-eslint/no-shadow': ['error'],
        '@typescript-eslint/no-unnecessary-qualifier': 'error',
        '@typescript-eslint/no-unnecessary-type-arguments': 'error',
        '@typescript-eslint/no-unused-expressions': 'error',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-use-before-define': ['error', 'nofunc'],
        '@typescript-eslint/prefer-for-of': 'error',
        '@typescript-eslint/prefer-function-type': 'error',
        '@typescript-eslint/prefer-namespace-keyword': 'off',
        '@typescript-eslint/prefer-readonly': 'error',
        '@typescript-eslint/promise-function-async': ['error', { checkArrowFunctions: false }],
        '@typescript-eslint/quotes': [
            'error',
            'single',
            {
                avoidEscape: true,
                allowTemplateLiterals: true,
            },
        ],
        '@typescript-eslint/semi': ['error', 'always'],
        '@typescript-eslint/triple-slash-reference': [
            'error',
            {
                path: 'always',
                types: 'prefer-import',
                lib: 'always',
            },
        ],
        '@typescript-eslint/type-annotation-spacing': 'off',
        '@typescript-eslint/unified-signatures': 'error',
        'arrow-parens': ['off', 'always'],
        'brace-style': ['error', '1tbs'],
        'comma-dangle': ['error', 'always-multiline'],
        complexity: 'error',
        curly: 'error',
        'default-case': 'error',
        'eol-last': 'error',
        eqeqeq: ['error', 'smart'],
        'guard-for-in': 'error',
        'id-match': 'error',
        'import/no-default-export': 'error',
        'import/no-deprecated': 'off',
        'import/no-extraneous-dependencies': 'error',
        'import/no-internal-modules': 'error',
        'import/no-unassigned-import': ['error', { allow: ['reflect-metadata'] }],
        'import/order': 'error',
        'jest/no-focused-tests': 'error',
        'jsdoc/check-alignment': 'error',
        'jsdoc/check-indentation': 'error',
        'jsdoc/no-types': 'error',
        'linebreak-style': 'error',
        'lines-between-class-members': 'error',
        'max-len': ['error', { code: 140, ignoreTemplateLiterals: true, ignoreStrings: true }],
        'new-parens': 'error',
        'newline-per-chained-call': 'off',
        'no-bitwise': 'error',
        'no-caller': 'error',
        'no-console': 'off',
        'no-control-regex': 'error',
        'no-duplicate-imports': 'error',
        'no-eval': 'error',
        'no-fallthrough': 'off',
        'no-invalid-regexp': 'error',
        'no-invalid-this': 'error',
        'no-magic-numbers': 'off',
        'no-multi-str': 'off',
        'no-multiple-empty-lines': 'error',
        'no-new-wrappers': 'error',
        'no-octal-escape': 'error',
        'no-param-reassign': 'error',
        'no-redeclare': 'off',
        'no-regex-spaces': 'error',
        'no-restricted-imports': 'off',
        'no-restricted-syntax': ['error', 'ForInStatement'],
        'no-return-await': 'error',
        'no-sequences': 'error',
        'no-shadow': 'off',
        'no-template-curly-in-string': 'error',
        'no-throw-literal': 'error',
        'no-trailing-spaces': 'error',
        'no-undef-init': 'error',
        'no-unused-vars': 'off',
        'no-var': 'error',
        'no-void': 'error',
        'object-shorthand': 'off',
        'one-var': ['error', 'never'],
        'padding-line-between-statements': [
            'error',
            {
                blankLine: 'always',
                prev: '*',
                next: 'return',
            },
        ],
        'prefer-arrow/prefer-arrow-functions': 'off',
        'prefer-const': 'error',
        'prefer-object-spread': 'error',
        'prefer-template': 'error',
        'quote-props': ['error', 'as-needed'],
        radix: 'error',
        'security/detect-object-injection': 'off',
        'space-before-function-paren': 'off',
        'space-in-parens': ['error', 'never'],
        'valid-typeof': 'off',
        yoda: 'error',
        '@typescript-eslint/tslint/config': [
            'error',
            {
                rules: {
                    encoding: true,
                    'import-spacing': true,
                    'match-default-export-name': true,
                    'no-dynamic-delete': true,
                    'no-unnecessary-callback-wrapper': true,
                    'number-literal-format': true,
                    'prefer-method-signature': true,
                    'prefer-while': true,
                    'switch-final-break': true,
                    typedef: [true, 'call-signature', 'property-declaration'],
                    whitespace: [true, 'check-branch', 'check-decl', 'check-operator', 'check-separator', 'check-type'],
                },
            },
        ],
        'header/header': [
            2,
            'line',
            [' Copyright (c) Microsoft Corporation. All rights reserved.', ' Licensed under the MIT License.'],
            2,
            ,
            { lineEndings: 'unix' },
        ],
        'sort-class-members/sort-class-members': [
            2,
            {
                order: [
                    '[static-properties]',
                    '[static-methods]',
                    '[properties]',
                    '[conventional-private-properties]',
                    'constructor',
                    '[methods]',
                    '[conventional-private-methods]',
                ],
                accessorPairPositioning: 'getThenSet',
            },
        ],
        'check-file/filename-naming-convention': [
            'error',
            {
                '**/*.{js,ts,txt,html,json,yaml,sh,ps1,cmd}': 'KEBAB_CASE',
            },
            {
                ignoreMiddleExtensions: true,
            },
        ],
        'check-file/folder-naming-convention': ['error', { './**/': 'KEBAB_CASE' }],
    },
    overrides: [
        {
            files: ['*.spec.ts'],
            rules: {
                // Disable those errors and warnings which are not a threat to test code
                // because the code is not run in production environments
                'security/detect-non-literal-regexp': 'off',
                'security/detect-non-literal-fs-filename': 'off',
                'security/detect-unsafe-regex': 'off',
                'security/detect-child-process': 'off',
                'security/detect-eval-with-expression': 'off',
            },
        },
    ],
};
