// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Container } from 'inversify';
import { ContextAwareLogger, loggerTypes } from 'logger';
import { IMock, Mock, Times } from 'typemoq';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { AppContext, WebController } from './web-controller';
import { WebControllerDispatcher } from './web-controller-dispatcher';
import { WebApiErrorCode } from './web-api-error-codes';

/* eslint-disable @typescript-eslint/no-explicit-any */

export class TestableWebController extends WebController {
    public static readonly handleRequestResult = 'handle-request-result';

    public readonly apiVersion = '1.0';

    public readonly apiName = 'controller-mock-api';

    public requestArgs: any[];

    public async invoke(appContext: AppContext, ...args: any[]): Promise<any> {
        this.appContext = appContext;
        this.requestArgs = args;

        return TestableWebController.handleRequestResult;
    }

    protected async validateRequest(...args: any[]): Promise<WebApiErrorCode> {
        return undefined;
    }

    protected async handleRequest(...args: any[]): Promise<void> {
        return;
    }
}

describe(WebControllerDispatcher, () => {
    let webControllerDispatcher: WebControllerDispatcher;
    let containerMock: IMock<Container>;
    let appContext: AppContext;
    let testableWebController: TestableWebController;
    let processLifeCycleContainerMock: IMock<Container>;
    let loggerMock: IMock<MockableLogger>;

    beforeEach(() => {
        appContext = { request: {} } as AppContext;
        loggerMock = Mock.ofType(MockableLogger);
        testableWebController = new TestableWebController(loggerMock.object);

        containerMock = Mock.ofType(Container);
        processLifeCycleContainerMock = Mock.ofType(Container);

        containerMock.setup((c) => c.get(TestableWebController)).returns(() => testableWebController);
        containerMock.setup((c) => c.get(ContextAwareLogger)).returns(() => loggerMock.object);
    });

    afterEach(() => {
        loggerMock.verifyAll();
        containerMock.verifyAll();
        processLifeCycleContainerMock.verifyAll();
    });

    it('should invoke controller instance with args', async () => {
        webControllerDispatcher = new WebControllerDispatcher(processLifeCycleContainerMock.object);

        loggerMock
            .setup((l) => l.setup())
            .returns(() => Promise.resolve())
            .verifiable(Times.once());

        await webControllerDispatcher.processRequest(containerMock.object, TestableWebController, appContext, 1, 'a');

        expect(testableWebController.appContext).toEqual(appContext);
        expect(testableWebController.requestArgs).toEqual([1, 'a']);
    });

    it('should set base telemetry properties', async () => {
        const processStub: typeof process = {
            env: {
                WEBSITE_INSTANCE_ID: 'server_id',
            },
        } as any;

        processLifeCycleContainerMock.setup((c) => c.get(loggerTypes.Process)).returns(() => processStub);

        webControllerDispatcher = new WebControllerDispatcher(processLifeCycleContainerMock.object);

        expect((webControllerDispatcher as any).getTelemetryBaseProperties()).toEqual({
            source: 'azure-function',
            serverInstanceId: 'server_id',
        });
    });

    it('should do nothing on invoking custom action', async () => {
        webControllerDispatcher = new WebControllerDispatcher(processLifeCycleContainerMock.object);

        expect(await (webControllerDispatcher as any).runCustomAction(undefined));
    });

    it('return result of invoke', async () => {
        loggerMock
            .setup((l) => l.setup())
            .returns(() => Promise.resolve())
            .verifiable(Times.once());

        webControllerDispatcher = new WebControllerDispatcher(processLifeCycleContainerMock.object);
        await expect(webControllerDispatcher.processRequest(containerMock.object, TestableWebController, appContext)).resolves.toBe(
            TestableWebController.handleRequestResult,
        );
    });
});
