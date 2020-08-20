// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: 'browser-imports.js',
    output: {
        file: 'dist/browser-imports.js',
        name: 'finder',
        format: 'iife',
    },
    plugins: [resolve(), commonjs()],
};
