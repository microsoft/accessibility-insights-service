// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as utils from 'util';
import { serializeError as serializeErrorExt } from 'serialize-error';
import { System } from './system';

/* eslint-disable @typescript-eslint/no-floating-promises, @typescript-eslint/no-explicit-any */

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
});
