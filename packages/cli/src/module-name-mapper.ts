// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable: no-var-requires no-require-imports no-unsafe-any no-any
const moduleRefmapper = require('module');
const osMapper = require('os');

moduleRefmapper._resolveFilename = new Proxy(moduleRefmapper._resolveFilename, {
    apply(target: any, thisArg: any, argumentsList: any): any {
        const moduleName = argumentsList[0] as string;
        let path = Reflect.apply(target, thisArg, argumentsList) as string;
        if (moduleName.startsWith('@uifabric/styling')) {
            if (osMapper.type() === 'Windows_NT') {
                path = path.replace('\\lib\\', '\\lib-commonjs\\');
            } else {
                path = path.replace('/lib/', '/lib-commonjs/');
            }
        }

        return path;
    },
});
