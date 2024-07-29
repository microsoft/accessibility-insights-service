// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { RestApiConfig, ServiceConfiguration } from 'common';
import { Logger } from 'logger';
import { IMock, Mock } from 'typemoq';
import { HttpRequest } from '@azure/functions';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { ApiController } from './api-controller';
import { WebApiErrorCode, WebApiErrorCodes } from './web-api-error-codes';
import { AppContext } from './web-controller';

/* eslint-disable @typescript-eslint/no-explicit-any */

class TestableApiController extends ApiController {
    public readonly apiVersion = '1.0';

    public readonly apiName = 'web-api-test';

    public handleRequestInvoked = false;

    public args: any[];

    public constructor(logger: Logger, public requestContext: AppContext, public readonly serviceConfig: ServiceConfiguration = undefined) {
        super(logger);
        this.appContext = requestContext;
    }

    public async handleRequest(...requestArgs: any[]): Promise<any> {
        this.handleRequestInvoked = true;
        this.args = requestArgs;
    }

    public async validateRequest(): Promise<WebApiErrorCode> {
        return super.validateRequest();
    }

    public async validateContentType(): Promise<WebApiErrorCode> {
        return super.validateContentType();
    }

    public validateApiVersion(): WebApiErrorCode {
        return super.validateApiVersion();
    }

    public async getRestApiConfig(): Promise<RestApiConfig> {
        return super.getRestApiConfig();
    }
}

describe(ApiController, () => {
    let loggerMock: IMock<MockableLogger>;

    beforeEach(() => {
        loggerMock = Mock.ofType(MockableLogger);
    });

    describe('validateContentType()', () => {
        it('should skip content validation on GET', async () => {
            const appContext = {
                request: {
                    method: 'GET',
                },
            } as AppContext;
            const apiControllerMock = new TestableApiController(loggerMock.object, appContext);
            const result = await apiControllerMock.validateContentType();
            expect(result).toBeUndefined();
        });

        it('should fail when empty request body', async () => {
            const appContext = {
                request: {
                    method: 'POST',
                    bodyUsed: true,
                },
            } as AppContext;
            const apiControllerMock = new TestableApiController(loggerMock.object, appContext);
            const result = await apiControllerMock.validateContentType();
            expect(result).toEqual(WebApiErrorCodes.invalidJsonDocument);
        });

        it('should fail when no HTTP headers present', async () => {
            const appContext = {
                request: {
                    method: 'POST',
                    bodyUsed: false,
                    text: async () => Promise.resolve(`{ "id": "1" }`),
                },
            } as AppContext;
            const apiControllerMock = new TestableApiController(loggerMock.object, appContext);
            const result = await apiControllerMock.validateContentType();
            expect(result).toEqual(WebApiErrorCodes.missingContentTypeHeader);
        });

        it('should fail when missing content-type HTTP header', async () => {
            const appContext = {
                request: {
                    method: 'POST',
                    bodyUsed: false,
                    text: () => Promise.resolve(`{ "id": "1" }`),
                    headers: new HttpRequest({ url: 'http://localhost/', method: 'POST' }).headers,
                },
            } as AppContext;
            const apiControllerMock = new TestableApiController(loggerMock.object, appContext);
            const result = await apiControllerMock.validateContentType();
            expect(result).toEqual(WebApiErrorCodes.missingContentTypeHeader);
        });

        it('should fail when content-type HTTP header is invalid', async () => {
            const appContext = {
                request: {
                    method: 'POST',
                    bodyUsed: false,
                    text: () => Promise.resolve(`{ "id": "1" }`),
                    headers: new HttpRequest({ url: 'http://localhost/', method: 'POST', headers: { 'content-type': 'text/plain' } })
                        .headers,
                },
            } as AppContext;
            const apiControllerMock = new TestableApiController(loggerMock.object, appContext);
            const result = await apiControllerMock.validateContentType();
            expect(result).toEqual(WebApiErrorCodes.unsupportedContentType);
        });

        it('should accept valid content-type HTTP header', async () => {
            const appContext = {
                request: {
                    method: 'POST',
                    bodyUsed: false,
                    text: () => Promise.resolve(`{ "id": "1" }`),
                    headers: new HttpRequest({ url: 'http://localhost/', method: 'POST', headers: { 'content-type': 'application/json' } })
                        .headers,
                },
            } as AppContext;
            const apiControllerMock = new TestableApiController(loggerMock.object, appContext);
            const result = await apiControllerMock.validateContentType();
            expect(result).toBeUndefined();
        });
    });

    describe('validateApiVersion()', () => {
        it('should fail when missing api-version query param', () => {
            const appContext = {
                request: {},
            } as AppContext;
            const apiControllerMock = new TestableApiController(loggerMock.object, appContext);
            const result = apiControllerMock.validateApiVersion();
            expect(result).toEqual(WebApiErrorCodes.missingApiVersionQueryParameter);
        });

        it('should fail when invalid api-version query param value', () => {
            const appContext = {
                request: {
                    query: new HttpRequest({ url: 'http://localhost/', method: 'POST', query: { 'api-version': '7.0' } }).query,
                },
            } as AppContext;
            const apiControllerMock = new TestableApiController(loggerMock.object, appContext);
            const result = apiControllerMock.validateApiVersion();
            expect(result).toEqual(WebApiErrorCodes.unsupportedApiVersion);
        });

        it('should accept valid api-version', () => {
            const appContext = {
                request: {
                    query: new HttpRequest({ url: 'http://localhost/', method: 'POST', query: { 'api-version': '1.0' } }).query,
                },
            } as AppContext;
            const apiControllerMock = new TestableApiController(loggerMock.object, appContext);
            const result = apiControllerMock.validateApiVersion();
            expect(result).toBeUndefined();
        });
    });

    describe('tryGetPayload()', () => {
        it('should detect no payload in request', async () => {
            const appContext = {
                request: {},
            } as AppContext;
            const apiControllerMock = new TestableApiController(loggerMock.object, appContext);
            const payload = await apiControllerMock.tryGetPayload();
            expect(payload).toBeUndefined();
        });

        it('should detect empty payload in request', async () => {
            const appContext = {
                request: {
                    bodyUsed: false,
                    text: () => Promise.resolve('{}'),
                },
            } as AppContext;
            const apiControllerMock = new TestableApiController(loggerMock.object, appContext);
            const payload = await apiControllerMock.tryGetPayload();
            expect(payload).toBeUndefined();
        });

        it('should detect invalid content', async () => {
            const appContext = {
                request: {
                    bodyUsed: false,
                    text: () => Promise.resolve(`{ "id": "1"`),
                },
            } as AppContext;
            const apiControllerMock = new TestableApiController(loggerMock.object, appContext);
            const payload = await apiControllerMock.tryGetPayload();
            expect(payload).toEqual(undefined);
        });

        it('should detect payload in request', async () => {
            const appContext = {
                request: {
                    bodyUsed: false,
                    text: () => Promise.resolve(`{ "id": 1 }`),
                },
            } as AppContext;
            const apiControllerMock = new TestableApiController(loggerMock.object, appContext);
            const payload = await apiControllerMock.tryGetPayload();
            expect(payload).toEqual({ id: 1 });
        });
    });

    describe('validateRequest()', () => {
        it('should reject invalid request on API validation', async () => {
            const appContext = {
                request: {
                    method: 'POST',
                },
            } as AppContext;
            const apiControllerMock = new TestableApiController(loggerMock.object, appContext);
            const result = await apiControllerMock.validateRequest();
            expect(result).toEqual(WebApiErrorCodes.missingApiVersionQueryParameter);
        });

        it('should reject invalid request on content validation', async () => {
            const appContext = {
                request: {
                    method: 'POST',
                    query: new HttpRequest({ url: 'http://localhost/', method: 'POST', query: { 'api-version': '1.0' } }).query,
                },
            } as AppContext;
            const apiControllerMock = new TestableApiController(loggerMock.object, appContext);
            const result = await apiControllerMock.validateRequest();
            expect(result).toEqual(WebApiErrorCodes.invalidJsonDocument);
        });

        it('should accept valid request', async () => {
            const httpRequest = new HttpRequest({
                url: 'http://localhost/',
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                query: { 'api-version': '1.0' },
            });
            const appContext = {
                request: {
                    method: 'POST',
                    bodyUsed: false,
                    text: () => Promise.resolve(`{ "id": "1" }`),
                    headers: httpRequest.headers,
                    query: httpRequest.query,
                },
            } as AppContext;
            const apiControllerMock = new TestableApiController(loggerMock.object, appContext);
            const result = await apiControllerMock.validateRequest();
            expect(result).toBeUndefined();
        });
    });

    describe('getRestApiConfig()', () => {
        it('should get config value', async () => {
            const appContext = {
                request: {},
            } as AppContext;
            const configStub: RestApiConfig = {
                maxScanRequestBatchCount: 1,
                scanRequestProcessingDelayInSeconds: 2,
                minScanPriorityValue: -1,
                maxScanPriorityValue: 1,
            };

            const serviceConfigMock = Mock.ofType(ServiceConfiguration);
            serviceConfigMock
                .setup(async (o) => o.getConfigValue('restApiConfig'))
                .returns(async () => {
                    return Promise.resolve(configStub);
                })
                .verifiable();

            const apiControllerMock = new TestableApiController(loggerMock.object, appContext, serviceConfigMock.object);
            const actualConfig = await apiControllerMock.getRestApiConfig();

            expect(actualConfig).toEqual(configStub);
            serviceConfigMock.verifyAll();
        });
    });
});
