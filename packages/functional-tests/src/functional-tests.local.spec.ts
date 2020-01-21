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
    const clientId = process.env.SP_CLIENT_ID;
    const clientSecret = process.env.SP_PASSWORD;
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
            const container = new Container({ autoBindInjectable: true });
            setupRuntimeConfigContainer(container);
            container.bind(Logger).toDynamicValue(_ => {
                return new GlobalLogger([new ConsoleLoggerClient(container.get(ServiceConfiguration), console)], process);
            });
            registerAzureServicesToContainer(container, CredentialType.AppService);
            const cred = new A11yServiceCredential(clientId, clientSecret, clientId, `https://login.microsoftonline.com/${tenantId}`);
            a11yServiceClient = new A11yServiceClient(cred, `https://apim-${apimName}.azure-api.net`);
            onDemandPageScanRunResultProvider = container.get(OnDemandPageScanRunResultProvider);
            guidGenerator = container.get(GuidGenerator);
            logger = container.get(Logger);
            testRunner = container.get(TestRunner);
            await logger.setup({
                source: 'dev box',
            });
            testRunner.setLogger(logger);
            testContextData = {
                scanUrl: 'https://www.washington.edu/accesscomputing/AU/before.html',
            };
            releaseIdStub = `dev-${guidGenerator.createGuid()}`;
            runIdStub = `dev-${guidGenerator.createGuid()}`;
        } else {
            console.log('One or more service credentials is missing. Skipping All functional tests.');
        }
    });

    testIf('PostScan', isServiceCredProvided, async (done: jest.DoneCallback) => {
        const postScanTests = getTests('PostScan');
        await testRunner.run(postScanTests, TestEnvironment.all, releaseIdStub, runIdStub);
        done();
    });

    testIf('ScanStatus', isServiceCredProvided, async (done: jest.DoneCallback) => {
        const scanStatusTests = getTests('ScanStatus');
        testContextData.scanId = (await a11yServiceClient.postScanUrl(testContextData.scanUrl)).body[0].scanId;
        await testRunner.run(scanStatusTests, TestEnvironment.all, releaseIdStub, runIdStub);
        done();
    });

    testIf('ScanExecution', isServiceCredProvided, async (done: jest.DoneCallback) => {
        const scanRunResultResponse = await waitForScanRequestCompletion();
        expect(scanRunResultResponse.reports.length).toEqual(2);
        testContextData.reportId = scanRunResultResponse.reports[0].reportId;
        done();
    });

    testIf('ScanPreProcessing', isServiceCredProvided, async (done: jest.DoneCallback) => {
        const scanPreProcessingTests = getTests('ScanPreProcessing');
        await testRunner.run(scanPreProcessingTests, TestEnvironment.all, releaseIdStub, runIdStub);
        done();
    });

    testIf('ScanQueueing', isServiceCredProvided, async (done: jest.DoneCallback) => {
        const scanQueueingTests = getTests('ScanQueueing');
        await testRunner.run(scanQueueingTests, TestEnvironment.all, releaseIdStub, runIdStub);
        done();
    });

    testIf('ScanReports', isServiceCredProvided, async (done: jest.DoneCallback) => {
        const scanReportsTests = getTests('ScanReports');
        await testRunner.run(scanReportsTests, TestEnvironment.all, releaseIdStub, runIdStub);
        done();
    });

    testIf('Finalizer', isServiceCredProvided, async (done: jest.DoneCallback) => {
        const finalizerTests = getTests('Finalizer');
        await testRunner.run(finalizerTests, TestEnvironment.all, releaseIdStub, runIdStub);
        done();
    });

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
});
