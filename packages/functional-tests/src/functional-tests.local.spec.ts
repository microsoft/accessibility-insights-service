// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { registerAzureServicesToContainer } from 'azure-services';
import { GuidGenerator, ServiceConfiguration, setupRuntimeConfigContainer, System } from 'common';
import * as dotenv from 'dotenv';
import { Container } from 'inversify';
import { isEmpty } from 'lodash';
import { ConsoleLoggerClient, GlobalLogger } from 'logger';
import { OnDemandPageScanRunResultProvider, RunState, ScanResultResponse, ScanRunResultResponse } from 'service-library';
import { A11yServiceClient, A11yServiceCredential } from 'web-api-client';
import { TestEnvironment } from './common-types';
import { functionalTestGroupTypes, TestGroupName } from './functional-test-group-types';
import { TestRunner } from './runner/test-runner';
import { TestContextData } from './test-context-data';
import { FunctionalTestGroup } from './test-groups/functional-test-group';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/strict-boolean-expressions */

describe('functional tests', () => {
    dotenv.config({ path: `${__dirname}/.env` });
    const clientId = process.env.REST_API_SP_APP_ID;
    const clientSecret = process.env.REST_API_SP_APP_SECRET;
    const tenantId = process.env.SP_TENANT;
    const apimName = process.env.APIM_SERVICE_NAME;

    let logger: GlobalLogger;
    let a11yServiceClient: A11yServiceClient;
    let testRunner: TestRunner;
    let guidGenerator: GuidGenerator;
    let testContextData: TestContextData;
    let onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider;
    let releaseIdStub: string;
    let runIdStub: string;

    beforeAll(async () => {
        if (isServiceCredProvided()) {
            const container = getContainer();
            onDemandPageScanRunResultProvider = container.get(OnDemandPageScanRunResultProvider);
            guidGenerator = container.get(GuidGenerator);
            logger = container.get(GlobalLogger);
            testRunner = container.get(TestRunner);
            a11yServiceClient = container.get(A11yServiceClient);
            await logger.setup({
                source: 'dev box',
            });
            testRunner.setLogger(logger);
            testContextData = {
                scanUrl: 'https://www.washington.edu/accesscomputing/AU/before.html',
            };
            testContextData.scanId = (await a11yServiceClient.postScanUrl(testContextData.scanUrl)).body[0].scanId;
            releaseIdStub = `dev-${guidGenerator.createGuid()}`;
            runIdStub = `dev-${guidGenerator.createGuid()}`;
        } else {
            console.log('One or more service credentials is missing. Skipping All functional tests.');
        }
    });

    testEach(['PostScan', 'ScanStatus'], isServiceCredProvided);

    testIf('ScanExecution', isServiceCredProvided, async () => {
        await waitForScanRequestCompletion();
    });

    testEach(['SingleScanPostCompletion', 'ScanQueueing', 'ScanReports', 'Finalizer'], isServiceCredProvided);

    function isServiceCredProvided(): boolean {
        return !isEmpty(clientId) && !isEmpty(clientSecret) && !isEmpty(tenantId) && !isEmpty(apimName);
    }

    function testIf(name: string, condition: () => boolean | Promise<boolean>, callback: () => void): void {
        test(
            name,
            async (): Promise<void> => {
                if (await condition()) {
                    callback();
                } else {
                    console.log(`Functional Test '${name}' Skipped`);
                }
            },
            10 * 60 * 1000,
        );
    }

    function testEach(names: TestGroupName[], condition: () => boolean | Promise<boolean>): void {
        names.forEach((name) => {
            testIf(name, condition, async () => {
                const testContainer = getTests(name);
                await testRunner.run(testContainer, {
                    environment: TestEnvironment.all,
                    releaseId: releaseIdStub,
                    runId: runIdStub,
                    scenarioName: 'local',
                });
            });
        });
    }

    async function waitForScanRequestCompletion(): Promise<ScanRunResultResponse> {
        let scanRunState: RunState = 'pending';
        let scanResultResponse: ScanResultResponse;
        while (scanRunState !== 'completed' && scanRunState !== 'failed') {
            console.log('waiting 10 seconds before sending the next request...');
            await System.wait(10000);
            scanResultResponse = (await a11yServiceClient.getScanStatus(testContextData.scanId)).body;
            scanRunState = (<ScanRunResultResponse>scanResultResponse).run.state;
        }

        return <ScanRunResultResponse>scanResultResponse;
    }

    function getTests(testGroupName: TestGroupName): FunctionalTestGroup {
        const ctor = functionalTestGroupTypes[testGroupName];
        const tests = new ctor(a11yServiceClient, onDemandPageScanRunResultProvider, guidGenerator);
        tests.setTestContext(testContextData);

        return tests;
    }

    function getContainer(): Container {
        const container = new Container({ autoBindInjectable: true });

        setupRuntimeConfigContainer(container);
        container.bind(GlobalLogger).toDynamicValue((_) => {
            return new GlobalLogger([new ConsoleLoggerClient(container.get(ServiceConfiguration), console)]);
        });
        registerAzureServicesToContainer(container);

        container.bind(A11yServiceClient).toDynamicValue((_) => {
            const cred = new A11yServiceCredential(clientId, clientId);

            return new A11yServiceClient(cred, `https://apim-${apimName}.azure-api.net`);
        });

        return container;
    }
});
