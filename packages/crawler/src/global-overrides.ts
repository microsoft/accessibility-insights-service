// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export {};

// tslint:disable: no-any no-unsafe-any no-require-imports no-var-requires no-function-expression
function overrideCheckPrototypeUtilsFunc(exports: any): any {
    const originalFunc = exports.checkParamPrototypeOrThrow;
    exports.checkParamPrototypeOrThrow = function (...args: any): any {
        if (args[3] === 'Apify.RequestQueue') {
            return true;
        } else {
            return originalFunc(...args);
        }
    };

    return exports;
}

function overrideExports(moduleName: string, exports: any): any {
    if (moduleName === 'apify-shared/utilities') {
        return overrideCheckPrototypeUtilsFunc(exports);
    }

    return exports;
}

const moduleRef = require('module');
moduleRef.prototype.require = new Proxy(moduleRef.prototype.require, {
    apply(target: any, thisArg: any, argumentsList: any): any {
        const moduleName = argumentsList[0];
        const exports = Reflect.apply(target, thisArg, argumentsList);

        return overrideExports(moduleName, exports);
    },
});

moduleRef._resolveFilename = new Proxy(moduleRef._resolveFilename, {
    apply(target: any, thisArg: any, argumentsList: any): any {
        const moduleName = argumentsList[0] as string;
        let path = Reflect.apply(target, thisArg, argumentsList) as string;
        if (moduleName.startsWith('@uifabric/styling')) {
            if (require('os').type() === 'Windows_NT') {
                path = path.replace('\\lib\\', '\\lib-commonjs\\');
            } else {
                path = path.replace('/lib/', '/lib-commonjs/');
            }
        }

        return path;
    },
});
