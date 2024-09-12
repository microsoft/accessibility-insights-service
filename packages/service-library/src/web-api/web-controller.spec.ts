// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { System } from 'common';
import { IMock, It, Mock, Times } from 'typemoq';
import { HttpResponse } from '@azure/functions';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { AppContext, WebController } from './web-controller';
import { WebApiErrorCode, WebApiErrorCodes } from './web-api-error-codes';

/* eslint-disable @typescript-eslint/no-explicit-any */

export class TestableWebController extends WebController {
    public readonly appResponse = { body: 'response', headers: new HttpResponse().headers } as any;

    public readonly apiVersion = '1.0';

    public readonly apiName = 'controller-mock-api';

    public validateRequestInvoked = false;

    public handleRequestInvoked = false;

    public requestArgs: any[];

    public getBaseTelemetryProperties(): { [name: string]: string } {
        return super.getBaseTelemetryProperties();
    }

    protected async validateRequest(...args: any[]): Promise<WebApiErrorCode> {
        this.validateRequestInvoked = true;

        return args[0] !== 'valid' ? WebApiErrorCodes.internalError : undefined;
    }

    protected async handleRequest(...args: any[]): Promise<any> {
        this.handleRequestInvoked = true;
        if (args[0] === undefined) {
            throw new Error('At least one parameter is expected');
        }

        return this.appResponse;
    }
}

const invocationId = 'test-invocation-id';

describe(WebController, () => {
    let appContext: AppContext;
    let testSubject: TestableWebController;
    let loggerMock: IMock<MockableLogger>;

    beforeEach(() => {
        appContext = {
            context: {
                invocationId,
                functionName: 'functionName',
                options: {
                    trigger: {
                        type: 'httpTrigger',
                    },
                },
            },
        } as AppContext;
        loggerMock = Mock.ofType(MockableLogger);
        loggerMock.setup((l) => l.setCommonProperties(It.isAny())).returns(() => Promise.resolve(undefined));
        testSubject = new TestableWebController(loggerMock.object);
    });

    it('should setup context aware logger', async () => {
        loggerMock.reset();
        loggerMock
            .setup((l) =>
                l.setCommonProperties(
                    It.isValue({
                        apiName: testSubject.apiName,
                        apiVersion: testSubject.apiVersion,
                        controller: 'TestableWebController',
                        functionName: 'functionName',
                        invocationId,
                    }),
                ),
            )
            .verifiable(Times.once());

        await testSubject.invoke(appContext, 'valid');
        loggerMock.verifyAll();
    });

    it('should handle request if request is valid', async () => {
        await testSubject.invoke(appContext, 'valid');
        expect(testSubject.validateRequestInvoked).toEqual(true);
        expect(testSubject.handleRequestInvoked).toEqual(true);
    });

    it('should not handle request if request is invalid', async () => {
        await testSubject.invoke(appContext, 'invalid');
        expect(testSubject.validateRequestInvoked).toEqual(true);
        expect(testSubject.handleRequestInvoked).toEqual(false);
    });

    it('should set content-type response header if missing', async () => {
        await testSubject.invoke(appContext, 'valid');
        expect(testSubject.appResponse.headers.get('content-type')).toEqual('application/json; charset=utf-8');
        expect(testSubject.appResponse.headers.get('X-Content-Type-Options')).toEqual('nosniff');
    });

    it('should not set content-type response header if exists', async () => {
        await testSubject.invoke(appContext, 'valid');
        testSubject.appResponse.headers.set('content-type', 'text/plain');
        expect(testSubject.appResponse.headers.get('content-type')).toEqual('text/plain');
    });

    it('verifies base telemetry properties', async () => {
        await testSubject.invoke(appContext, 'valid');

        expect(testSubject.getBaseTelemetryProperties()).toEqual({
            apiName: testSubject.apiName,
            apiVersion: testSubject.apiVersion,
            controller: 'TestableWebController',
            functionName: 'functionName',
            invocationId,
        });
    });

    it('returns handleRequest result', async () => {
        await expect(testSubject.invoke(appContext, 'valid')).resolves.toBe(testSubject.appResponse);
    });

    it('log exception', async () => {
        const error = new Error('Logger.setCommonProperties() exception.');
        loggerMock.reset();
        loggerMock
            .setup((o) => {
                o.setCommonProperties(It.isAny());
            })
            .throws(error)
            .verifiable();

        loggerMock
            .setup((o) => {
                o.logError('Encountered an error while processing HTTP web request.', { error: System.serializeError(error) });
            })
            .verifiable();

        await expect(testSubject.invoke(appContext, 'valid')).rejects.toEqual(error);
    });
});
