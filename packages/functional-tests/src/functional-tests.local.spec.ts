// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { CredentialType, registerAzureServicesToContainer } from 'azure-services';
import { GuidGenerator, ServiceConfiguration, setupRuntimeConfigContainer, System } from 'common';
import * as dotenv from 'dotenv';
import { Container } from 'inversify';
import { isEmpty } from 'lodash';
import { ConsoleLoggerClient, GlobalLogger, Logger } from 'logger';
import { OnDemandPageScanRunResultProvider, RunState, ScanResultResponse, ScanRunResultResponse } from 'service-library';
import { A11yServiceClient, A11yServiceCredential } from 'web-api-client';

import { TestEnvironment } from './common-types';
import { functionalTestGroupTypes, TestGroupName } from './functional-test-group-types';
import { TestRunner } from './runner/test-runner';
import { TestContextData } from './test-group-data';
import { FunctionalTestGroup } from './test-groups/functional-test-group';

// tslint:disable: mocha-no-side-effect-code no-any no-unsafe-any mocha-unneeded-done strict-boolean-expressions

describe('functional tests', () => {
    dotenv.config({ path: `${__dirname}/.env` });
    const clientId = process.env.REST_API_SP_APP_ID;
    const clientSecret = process.env.REST_API_SP_APP_SECRET;
    const tenantId = process.env.SP_TENANT;
    const apimName = process.env.APIM_SERVICE_NAME;
    const cosmosKey = process.env.COSMOS_DB_KEY;
    const cosmosUrl = process.env.COSMOS_DB_URL;

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
            logger = container.get(Logger);
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

    testIf('ScanExecution', isServiceCredProvided, async (done: jest.DoneCallback) => {
        await waitForScanRequestCompletion();
        done();
    });

    testEach(['ScanPreProcessing', 'ScanQueueing', 'ScanReports', 'Finalizer'], isServiceCredProvided);

    function isServiceCredProvided(): boolean {
        return (
            !isEmpty(clientId) &&
            !isEmpty(clientSecret) &&
            !isEmpty(tenantId) &&
            !isEmpty(apimName) &&
            !isEmpty(cosmosKey) &&
            !isEmpty(cosmosUrl)
        );
    }

    function testIf(name: string, condition: () => boolean | Promise<boolean>, callback: any): void {
        test(
            name,
            async done => {
                if (await condition()) {
                    callback(done);
                } else {
                    console.log(`Functional Test '${name}' Skipped`);
                    done();
                }
            },
            10 * 60 * 1000,
        );
    }

    function testEach(names: TestGroupName[], condition: () => boolean | Promise<boolean>): void {
        names.forEach(name => {
            testIf(name, condition, async (done: jest.DoneCallback) => {
                const testContainer = getTests(name);
                await testRunner.run(testContainer, TestEnvironment.all, releaseIdStub, runIdStub);
                done();
            });
        });
    }

    async function waitForScanRequestCompletion(): Promise<ScanRunResultResponse> {
        let scanRunState: RunState = 'pending';
        let scanResultResponse: ScanResultResponse;
        while (scanRunState !== 'completed' && scanRunState !== 'failed') {
            console.log('waiting 10 seconds before sending the next request...');
            // tslint:disable-next-line: no-empty
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
        container.bind(Logger).toDynamicValue(_ => {
            return new GlobalLogger([new ConsoleLoggerClient(container.get(ServiceConfiguration), console)], process);
        });
        registerAzureServicesToContainer(container, CredentialType.AppService);

        container.bind(A11yServiceClient).toDynamicValue(_ => {
            const cred = new A11yServiceCredential(clientId, clientSecret, clientId, `https://login.microsoftonline.com/${tenantId}`);

            return new A11yServiceClient(cred, `https://apim-${apimName}.azure-api.net`);
        });

        return container;
    }
});
