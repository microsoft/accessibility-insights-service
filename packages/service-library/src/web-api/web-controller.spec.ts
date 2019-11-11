// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { ContextAwareLogger } from 'logger';
import { IMock, It, Mock, Times } from 'typemoq';
import { WebController } from './web-controller';

// tslint:disable: no-any no-unsafe-any

export class TestableWebController extends WebController {
    public static readonly handleRequestResponse = 'handle-request-response';
    public readonly apiVersion = '1.0';
    public readonly apiName = 'controller-mock-api';
    public validateRequestInvoked = false;
    public handleRequestInvoked = false;
    public requestArgs: any[];

    // tslint:disable-next-line: no-unnecessary-override
    public getBaseTelemetryProperties(): { [name: string]: string } {
        return super.getBaseTelemetryProperties();
    }

    protected validateRequest(...args: any[]): boolean {
        this.validateRequestInvoked = true;

        return args[0] === 'valid';
    }

    protected async handleRequest(...args: any[]): Promise<unknown> {
        this.handleRequestInvoked = true;
        if (args[0] === undefined) {
            throw new Error('At least one parameter is expected');
        }

        return TestableWebController.handleRequestResponse;
    }
}

describe(WebController, () => {
    let context: Context;
    let testSubject: TestableWebController;
    const invocationId = 'test-invocation-id';
    let contextAwareLoggerMock: IMock<ContextAwareLogger>;

    beforeEach(() => {
        context = <Context>(<unknown>{ bindingDefinitions: {}, res: {}, invocationId: invocationId });
        contextAwareLoggerMock = Mock.ofType(ContextAwareLogger);

        testSubject = new TestableWebController(contextAwareLoggerMock.object);

        contextAwareLoggerMock.setup(l => l.setup(It.isAny())).returns(() => Promise.resolve(undefined));
    });

    it('should setup context aware logger', async () => {
        contextAwareLoggerMock.reset();
        contextAwareLoggerMock
            .setup(l =>
                l.setup(
                    It.isValue({
                        apiName: testSubject.apiName,
                        apiVersion: testSubject.apiVersion,
                        controller: 'TestableWebController',
                        invocationId,
                    }),
                ),
            )
            .verifiable(Times.once());

        await testSubject.invoke(context, 'valid');
        contextAwareLoggerMock.verifyAll();
    });

    it('should handle request if request is valid', async () => {
        await testSubject.invoke(context, 'valid');
        expect(testSubject.validateRequestInvoked).toEqual(true);
        expect(testSubject.handleRequestInvoked).toEqual(true);
    });

    it('should not handle request if request is invalid', async () => {
        await testSubject.invoke(context, 'invalid');
        expect(testSubject.validateRequestInvoked).toEqual(true);
        expect(testSubject.handleRequestInvoked).toEqual(false);
    });

    it('should add content-type response header if no any', async () => {
        await testSubject.invoke(context, 'valid');
        expect(testSubject.context.res.headers['content-type']).toEqual('application/json; charset=utf-8');
    });

    it('should add content-type response header if if other', async () => {
        context.res.headers = {
            'content-length': 100,
        };
        await testSubject.invoke(context, 'valid');
        expect(testSubject.context.res.headers['content-type']).toEqual('application/json; charset=utf-8');
    });

    it('should skip adding content-type response header if any', async () => {
        context.res.headers = {
            'content-type': 'text/plain',
        };
        await testSubject.invoke(context, 'valid');
        expect(testSubject.context.res.headers['content-type']).toEqual('text/plain');
    });

    it('verifies base telemetry properties', async () => {
        context.res.headers = {
            'content-type': 'text/plain',
        };
        await testSubject.invoke(context, 'valid');

        expect(testSubject.getBaseTelemetryProperties()).toEqual({
            apiName: testSubject.apiName,
            apiVersion: testSubject.apiVersion,
            controller: 'TestableWebController',
            invocationId,
        });
    });

    it('returns handleRequest result', async () => {
        await expect(testSubject.invoke(context, 'valid')).resolves.toBe(TestableWebController.handleRequestResponse);
    });
});
