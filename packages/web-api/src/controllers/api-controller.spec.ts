// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { ApiController } from './api-controller';

export class ApiControllerMock extends ApiController {
    public readonly apiVersion = '1.0';
    public invoked = false;

    protected invokeImpl(): void {
        this.invoked = true;
    }
}

describe('validateContentType()', () => {
    it('should validate HTTP POST and PUT only', () => {
        const context = <Context>(<unknown>{
            req: {
                method: 'GET',
            },
        });
        const apiControllerMock = new ApiControllerMock(context);
        const valid = apiControllerMock.validateContentType();
        expect(context.res).toEqual(undefined);
        expect(valid).toEqual(true);
    });

    it('should validate empty body', () => {
        const context = <Context>(<unknown>{
            req: {
                method: 'POST',
            },
        });
        const apiControllerMock = new ApiControllerMock(context);
        const valid = apiControllerMock.validateContentType();
        expect(context.res).toEqual({ status: 204 });
        expect(valid).toEqual(false);
    });

    it('should validate when no HTTP headers', () => {
        const context = <Context>(<unknown>{
            req: {
                method: 'POST',
                rawBody: `{ id: '1' }`,
            },
        });
        const apiControllerMock = new ApiControllerMock(context);
        const valid = apiControllerMock.validateContentType();
        expect(context.res).toEqual({ status: 400, body: 'Content type was not specified' });
        expect(valid).toEqual(false);

        context.req.headers = {}; //.host = 'localhost';
        context.req.headers.host = 'localhost';
    });

    it('should validate missing content-type HTTP header', () => {
        const context = <Context>(<unknown>{
            req: {
                method: 'POST',
                rawBody: `{ id: '1' }`,
                headers: { host: 'localhost' },
            },
        });
        const apiControllerMock = new ApiControllerMock(context);
        const valid = apiControllerMock.validateContentType();
        expect(context.res).toEqual({ status: 400, body: 'Content type was not specified' });
        expect(valid).toEqual(false);
    });

    it('should validate application/json content-type HTTP header', () => {
        const context = <Context>(<unknown>{
            req: {
                method: 'POST',
                rawBody: `{ id: '1' }`,
                headers: {},
            },
        });
        context.req.headers['content-type'] = 'text/plain';
        const apiControllerMock = new ApiControllerMock(context);
        const valid = apiControllerMock.validateContentType();
        expect(context.res).toEqual({ status: 415, body: 'Content type is not supported' });
        expect(valid).toEqual(false);
    });

    it('should accept valid content type', () => {
        const context = <Context>(<unknown>{
            req: {
                method: 'POST',
                rawBody: `{ id: '1' }`,
                headers: {},
            },
        });
        context.req.headers['content-type'] = 'application/json';
        const apiControllerMock = new ApiControllerMock(context);
        const valid = apiControllerMock.validateContentType();
        expect(context.res).toEqual(undefined);
        expect(valid).toEqual(true);
    });
});

describe('validateApiVersion()', () => {
    it('should validate missing query param', () => {
        const context = <Context>(<unknown>{
            req: {},
        });
        const apiControllerMock = new ApiControllerMock(context);
        const valid = apiControllerMock.validateApiVersion();
        expect(context.res).toEqual({ status: 400, body: 'Client API version was not specified' });
        expect(valid).toEqual(false);
    });

    it('should validate invalid api version', () => {
        const context = <Context>(<unknown>{
            req: {
                query: {},
            },
        });
        context.req.query['api-version'] = '2.0';
        const apiControllerMock = new ApiControllerMock(context);
        const valid = apiControllerMock.validateApiVersion();
        expect(context.res).toEqual({ status: 400, body: 'Client API version is not supported' });
        expect(valid).toEqual(false);
    });

    it('should accept api version', () => {
        const context = <Context>(<unknown>{
            req: {
                query: {},
            },
        });
        context.req.query['api-version'] = '1.0';
        const apiControllerMock = new ApiControllerMock(context);
        const valid = apiControllerMock.validateApiVersion();
        expect(context.res).toEqual(undefined);
        expect(valid).toEqual(true);
    });
});

describe('hasPayload()', () => {
    it('should detect no payload', () => {
        const context = <Context>(<unknown>{
            req: {},
        });
        const apiControllerMock = new ApiControllerMock(context);
        const valid = apiControllerMock.hasPayload();
        expect(valid).toEqual(false);
    });

    it('should detect payload', () => {
        const context = <Context>(<unknown>{
            req: {
                rawBody: `{ id: '1' }`,
            },
        });
        const apiControllerMock = new ApiControllerMock(context);
        const valid = apiControllerMock.hasPayload();
        expect(valid).toEqual(true);
    });
});

describe('hasPayload()', () => {
    it('should not invoke controller implementation', () => {
        const context = <Context>(<unknown>{
            req: {
                method: 'POST',
            },
        });
        const apiControllerMock = new ApiControllerMock(context);
        apiControllerMock.invoke();
        expect(apiControllerMock.invoked).toEqual(false);
    });

    it('should invoke controller implementation', () => {
        const context = <Context>(<unknown>{
            req: {
                method: 'POST',
                rawBody: `{ id: '1' }`,
                headers: {},
                query: {},
            },
        });
        context.req.query['api-version'] = '1.0';
        context.req.headers['content-type'] = 'application/json';
        const apiControllerMock = new ApiControllerMock(context);
        apiControllerMock.invoke();
        expect(apiControllerMock.invoked).toEqual(true);
    });
});

describe('tryGetPayload()', () => {
    interface PayloadType {
        id: number;
    }

    it('should detect invalid content', () => {
        const context = <Context>(<unknown>{
            req: {
                rawBody: `{ id: 1`,
            },
        });
        const apiControllerMock = new ApiControllerMock(context);
        const payload = apiControllerMock.tryGetPayload<PayloadType>();
        expect(payload.hasValue).toEqual(false);
        expect(context.res.status).toEqual(400);
    });

    it('should parse body content', () => {
        const context = <Context>(<unknown>{
            req: {
                rawBody: `{ "id": 1 }`,
            },
        });
        const apiControllerMock = new ApiControllerMock(context);
        const payload = apiControllerMock.tryGetPayload<PayloadType>();
        expect(payload.hasValue).toEqual(true);
        expect(payload.value).toEqual({ id: 1 });
    });
});
