// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export {};

/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
const moduleRef = require('module');

moduleRef._resolveFilename = new Proxy(moduleRef._resolveFilename, {
    apply(target: any, thisArg: any, argumentsList: any): any {
        const moduleName = argumentsList[0] as string;
        let path = Reflect.apply(target, thisArg, argumentsList) as string;
        if (moduleName.indexOf('@uifabric/styling') >= 0) {
            path = fixModulePath('@uifabric', path);
        }

        return path;
    },
});

function fixModulePath(moduleName: string, path: string): string {
    // fix path of the package content only
    const index = path.lastIndexOf(moduleName);
    if (require('os').type() === 'Windows_NT') {
        return path.slice(0, index) + path.slice(index).replace('\\lib\\', '\\lib-commonjs\\');
    } else {
        return path.slice(0, index) + path.slice(index).replace('/lib/', '/lib-commonjs/');
    }
}
