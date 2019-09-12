// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { RestApiConfig, ServiceConfiguration } from 'common';
import { Mock, Times } from 'typemoq';
import { ApiController } from './api-controller';

// tslint:disable: no-any no-unnecessary-override no-null-keyword no-unsafe-any

export class TestableApiController extends ApiController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'web-api-test';
    public handleRequestInvoked = false;
    public args: any[];

    public constructor(public requestContext: Context = null, public readonly serviceConfig: ServiceConfiguration = null) {
        super();
        this.context = requestContext;
    }

    public async handleRequest(...requestArgs: any[]): Promise<void> {
        this.handleRequestInvoked = true;
        this.args = requestArgs;
    }

    public validateRequest(): boolean {
        return super.validateRequest();
    }

    public validateContentType(): boolean {
        return super.validateContentType();
    }

    public validateApiVersion(): boolean {
        return super.validateApiVersion();
    }

    public async getRestApiConfig(): Promise<RestApiConfig> {
        return super.getRestApiConfig();
    }
}

describe('validateContentType()', () => {
    it('should not fail content validation on non POST or PUT', () => {
        const context = <Context>(<unknown>{
            req: {
                method: 'GET',
            },
        });
        const apiControllerMock = new TestableApiController(context);
        const valid = apiControllerMock.validateContentType();
        expect(context.res).toEqual(undefined);
        expect(valid).toEqual(true);
    });

    it('should detect empty body for POST', () => {
        const context = <Context>(<unknown>{
            req: {
                method: 'POST',
            },
        });
        const apiControllerMock = new TestableApiController(context);
        const valid = apiControllerMock.validateContentType();
        expect(context.res).toEqual({ status: 204 });
        expect(valid).toEqual(false);
    });

    it('should detect empty body for PUT', () => {
        const context = <Context>(<unknown>{
            req: {
                method: 'PUT',
            },
        });
        const apiControllerMock = new TestableApiController(context);
        const valid = apiControllerMock.validateContentType();
        expect(context.res).toEqual({ status: 204 });
        expect(valid).toEqual(false);
    });

    it('should fail when no HTTP headers present', () => {
        const context = <Context>(<unknown>{
            req: {
                method: 'POST',
                rawBody: `{ id: '1' }`,
            },
        });
        const apiControllerMock = new TestableApiController(context);
        const valid = apiControllerMock.validateContentType();
        expect(context.res).toEqual({ status: 400, body: 'Content type was not specified' });
        expect(valid).toEqual(false);

        context.req.headers = {}; //.host = 'localhost';
        context.req.headers.host = 'localhost';
    });

    it('should fail when missing content-type HTTP header', () => {
        const context = <Context>(<unknown>{
            req: {
                method: 'POST',
                rawBody: `{ id: '1' }`,
                headers: { host: 'localhost' },
            },
        });
        const apiControllerMock = new TestableApiController(context);
        const valid = apiControllerMock.validateContentType();
        expect(context.res).toEqual({ status: 400, body: 'Content type was not specified' });
        expect(valid).toEqual(false);
    });

    it('should fail when non valid content-type HTTP header', () => {
        const context = <Context>(<unknown>{
            req: {
                method: 'POST',
                rawBody: `{ id: '1' }`,
                headers: {},
            },
        });
        context.req.headers['content-type'] = 'text/plain';
        const apiControllerMock = new TestableApiController(context);
        const valid = apiControllerMock.validateContentType();
        expect(context.res).toEqual({ status: 415, body: 'Content type is not supported' });
        expect(valid).toEqual(false);
    });

    it('should accept valid content-type HTTP header', () => {
        const context = <Context>(<unknown>{
            req: {
                method: 'POST',
                rawBody: `{ id: '1' }`,
                headers: {},
            },
        });
        context.req.headers['content-type'] = 'application/json';
        const apiControllerMock = new TestableApiController(context);
        const valid = apiControllerMock.validateContentType();
        expect(context.res).toEqual(undefined);
        expect(valid).toEqual(true);
    });
});

describe('validateApiVersion()', () => {
    it('should fail when missing api-version query param', () => {
        const context = <Context>(<unknown>{
            req: {},
        });
        const apiControllerMock = new TestableApiController(context);
        const valid = apiControllerMock.validateApiVersion();
        expect(context.res).toEqual({ status: 400, body: 'Client API version was not specified' });
        expect(valid).toEqual(false);
    });

    it('should fail when invalid api-version query param value', () => {
        const context = <Context>(<unknown>{
            req: {
                query: {},
            },
        });
        context.req.query['api-version'] = '2.0';
        const apiControllerMock = new TestableApiController(context);
        const valid = apiControllerMock.validateApiVersion();
        expect(context.res).toEqual({ status: 400, body: 'Client API version is not supported' });
        expect(valid).toEqual(false);
    });

    it('should accept valid api-version', () => {
        const context = <Context>(<unknown>{
            req: {
                query: {},
            },
        });
        context.req.query['api-version'] = '1.0';
        const apiControllerMock = new TestableApiController(context);
        const valid = apiControllerMock.validateApiVersion();
        expect(context.res).toEqual(undefined);
        expect(valid).toEqual(true);
    });
});

describe('hasPayload()', () => {
    it('should detect no payload in request', () => {
        const context = <Context>(<unknown>{
            req: {},
        });
        const apiControllerMock = new TestableApiController(context);
        const valid = apiControllerMock.hasPayload();
        expect(valid).toEqual(false);
    });

    it('should detect payload in request', () => {
        const context = <Context>(<unknown>{
            req: {
                rawBody: `{ id: '1' }`,
            },
        });
        const apiControllerMock = new TestableApiController(context);
        const valid = apiControllerMock.hasPayload();
        expect(valid).toEqual(true);
    });
});

describe('validateRequest()', () => {
    it('should reject invalid request', () => {
        const context = <Context>(<unknown>{
            req: {
                method: 'POST',
            },
        });
        const apiControllerMock = new TestableApiController(context);
        const valid = apiControllerMock.validateRequest();
        expect(valid).toEqual(false);
    });

    it('should accept valid request', () => {
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
        const apiControllerMock = new TestableApiController(context);
        const valid = apiControllerMock.validateRequest();
        expect(valid).toEqual(true);
    });
});

describe('invoke()', () => {
    it('should not handle invalid request', async () => {
        const context = <Context>(<unknown>{
            req: {
                method: 'POST',
            },
        });
        const apiControllerMock = new TestableApiController();
        expect(apiControllerMock.context).toBeNull();
        await apiControllerMock.invoke(context);
        expect(apiControllerMock.handleRequestInvoked).toEqual(false);
    });

    it('should handle valid request', async () => {
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
        const apiControllerMock = new TestableApiController();
        expect(apiControllerMock.context).toBeNull();
        await apiControllerMock.invoke(context);
        expect(apiControllerMock.handleRequestInvoked).toEqual(true);
    });

    it('should pass request args', async () => {
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
        const apiControllerMock = new TestableApiController();
        await apiControllerMock.invoke(context, 'a', 1);
        expect(apiControllerMock.handleRequestInvoked).toEqual(true);
        expect(apiControllerMock.args).toEqual(['a', 1]);
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
        const apiControllerMock = new TestableApiController(context);
        const payload = apiControllerMock.tryGetPayload<PayloadType>();
        expect(payload).toEqual(undefined);
        expect(context.res.status).toEqual(400);
    });

    it('should parse valid content', () => {
        const context = <Context>(<unknown>{
            req: {
                rawBody: `{ "id": 1 }`,
            },
        });
        const apiControllerMock = new TestableApiController(context);
        const payload = apiControllerMock.tryGetPayload<PayloadType>();
        expect(payload).toEqual({ id: 1 });
    });
});

describe('getRestApiConfig()', () => {
    it('should get config value', async () => {
        const context = <Context>(<unknown>{});
        const configStub = {
            maxScanRequestBatchCount: 1,
            minimumWaitTimeforScanResultQueryInSeconds: 2,
        };

        const serviceConfigMock = Mock.ofType(ServiceConfiguration);
        serviceConfigMock
            .setup(async sm => sm.getConfigValue('restApiConfig'))
            .returns(async () => {
                return Promise.resolve(configStub);
            })
            .verifiable(Times.once());

        const apiControllerMock = new TestableApiController(context, serviceConfigMock.object);
        const actualConfig = await apiControllerMock.getRestApiConfig();

        expect(actualConfig).toEqual(configStub);
        serviceConfigMock.verifyAll();
    });
});
