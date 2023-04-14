// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as utils from 'util';
import { serializeError as serializeErrorExt } from 'serialize-error';
import { System } from './system';

/* eslint-disable @typescript-eslint/no-floating-promises, @typescript-eslint/no-explicit-any */

describe('create instance if nil', () => {
    test.each([null, undefined])('creates instance when nil - %o', (testCase) => {
        expect(
            System.createInstanceIfNil(testCase, () => {
                return 1;
            }),
        ).toBe(1);
    });

    it('does not create instance when not nil', async () => {
        expect(
            System.createInstanceIfNil(1, () => {
                return 10;
            }),
        ).toBe(1);
    });

    it('returns promise when factory returns promise', async () => {
        const promise = Promise.resolve(1);
        await expect(
            System.createInstanceIfNil(null, async () => {
                return promise;
            }),
        ).resolves.toBe(1);
    });

    it('returns promise when passed instance is promise object', async () => {
        const promise = Promise.resolve(1);
        expect(
            System.createInstanceIfNil(promise, async () => {
                return Promise.resolve(10);
            }),
        ).resolves.toBe(1);
    });
});

describe('isNullOrEmptyString', () => {
    test.each([null, undefined, ''])('returns true when for %o', (testCase) => {
        expect(System.isNullOrEmptyString(testCase)).toBe(true);
    });

    test.each(['val1', ' '])('returns false for non null value %o', (testCase) => {
        expect(System.isNullOrEmptyString(testCase)).toBe(false);
    });
});

describe('chunkArray()', () => {
    it('chunk array', () => {
        const sourceArray = [1, 2, 3, 4, 5, 6, 7];
        const result = System.chunkArray(sourceArray, 3);
        expect(result.length).toEqual(3);
        expect(result[0]).toEqual([1, 2, 3]);
        expect(result[1]).toEqual([4, 5, 6]);
        expect(result[2]).toEqual([7]);
    });
});

describe('createRandomString()', () => {
    it('create random string', () => {
        let id = System.createRandomString(33);
        expect(id.length).toEqual(33);

        id = System.createRandomString();
        expect(id.length).toEqual(32);
    });
});

describe('serializeError()', () => {
    it('serialize error object', () => {
        const error = new Error('Error message');
        const errorStr = System.serializeError(error);
        expect(errorStr).toEqual(utils.inspect(serializeErrorExt(error), false, null));
    });

    it('serialize HTTP response error object', () => {
        const httpResponse = {
            statusCode: 412,
            request: {
                url: 'request url',
                method: 'PUT',
                body: 'request body',
            },
            response: {
                body: 'response body',
            },
        } as any;
        const { request, ...httpResponseExpected } = httpResponse;
        httpResponseExpected.request = {
            url: 'request url',
            method: 'PUT',
        };

        const errorStr = System.serializeError(httpResponse);
        expect(errorStr).toEqual(utils.inspect(serializeErrorExt(System.normalizeHttpResponse(httpResponseExpected)), false, null));
    });
});

describe('normalizeHttpResponse()', () => {
    it('should normalize HTTP request object', () => {
        const requestObj = {
            url: 'url',
            method: 'PUT',
            headers: [{ name: 'Accept', value: 'application/xml' }],
            body: 'body',
            operationSpec: { path: '/{containerName}/{blob}' },
        } as any;
        const httpResponse = {
            name: 'RestError',
            code: 'ConditionNotMet',
            statusCode: 412,
            request: requestObj,
            response: {
                headers: [{ name: 'content-length', value: '255' }],
                request: requestObj,
                status: 412,
                bodyAsText: 'bodyAsText',
            },
        } as any;
        const expectedResponse = JSON.parse(
            `{"name":"RestError","code":"ConditionNotMet","statusCode":412,"request":{"url":"url","method":"PUT"},"response":{"status":412,"bodyAsText":"bodyAsText"}}`,
        );

        const actualResponse = System.normalizeHttpResponse(httpResponse);
        expect(actualResponse).toEqual(expectedResponse);
    });
});

describe('getElapsedTime()', () => {
    let processHrtimeOriginal: NodeJS.HRTime;

    beforeEach(() => {
        processHrtimeOriginal = process.hrtime;
    });

    afterEach(() => {
        process.hrtime = processHrtimeOriginal;
    });

    it('get elapsed time', () => {
        process.hrtime = { bigint: () => 10000000000n } as NodeJS.HRTime;
        const timestamp = 3000;
        const elapsed = System.getElapsedTime(timestamp);
        expect(elapsed).toEqual(7000);
    });

    it('get timestamp', () => {
        process.hrtime = { bigint: () => 10000000000n } as NodeJS.HRTime;
        const elapsed = System.getTimestamp();
        expect(elapsed).toEqual(10000);
    });

    describe('waitLoop', () => {
        it('loop without timeout', async () => {
            let count = 0;
            const expectedResult = await System.waitLoop(
                async () => count++,
                async (r) => r === 3,
            );
            expect(expectedResult).toEqual(3);
        });

        it('loop with timeout', async () => {
            let count = 0;
            const expectedResult = await System.waitLoop(
                async () => count++,
                async (r) => r === 10000,
                1,
            );
            expect(expectedResult).toEqual(0);
        });
    });

    describe('isDebugEnabled', () => {
        beforeEach(() => {
            delete process.env.VSCODE_INSPECTOR_OPTIONS;
            delete process.env.NODE_OPTIONS;
        });

        it('debug enabled by vs code', () => {
            process.env.VSCODE_INSPECTOR_OPTIONS = 'options inspectorIpc options';
            expect(System.isDebugEnabled()).toEqual(true);
        });

        it('debug enabled by node', () => {
            process.env.NODE_OPTIONS = 'options --inspect-publish-uid options';
            expect(System.isDebugEnabled()).toEqual(true);
        });

        it('debug is not enabled', () => {
            expect(System.isDebugEnabled()).toEqual(false);
        });
    });
});
