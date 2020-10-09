// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

// eslint-disable-next-line import/no-internal-modules
import Request, { NormalizedOptions } from 'got/dist/source/core';
import { ResponseWithBodyType } from './a11y-service-client';
import { getSerializableResponse } from './serializable-response';

describe('SerializableResponse', () => {
    const body = 'body content';
    const statusCode = 200;
    const responseHeaders = { headerName: 'some value' };
    const urlString = 'https://www.url.com';
    const method = 'GET';
    const requestHeaders = { headerName: 'some other value' };

    let response: ResponseWithBodyType<string>;
    let request: Request;

    beforeEach(() => {
        request = {
            options: ({
                url: new URL(urlString),
                method,
                headers: requestHeaders,
                circularLink: response,
            } as unknown) as NormalizedOptions,
        } as Request;

        response = ({
            body,
            statusCode,
            headers: responseHeaders,
            request,
            unneededField: 'extra data',
        } as unknown) as ResponseWithBodyType<string>;
    });

    it('serializes response object', () => {
        const serializableResponse = {
            body,
            statusCode,
            headers: responseHeaders,
            request: {
                uri: new URL(urlString),
                method,
                headers: requestHeaders,
            },
        };

        expect(getSerializableResponse(response)).toEqual(serializableResponse);
    });

    it('serialized response can be converted to JSON', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (response as any).circularLink = response;

        expect(() => JSON.stringify(response)).toThrow();

        const SerializableResponse = getSerializableResponse(response);

        expect(() => JSON.stringify(SerializableResponse)).not.toThrow();
    });
});
