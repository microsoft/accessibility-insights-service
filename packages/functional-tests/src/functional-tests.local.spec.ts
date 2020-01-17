// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { CosmosClient } from '@azure/cosmos';
import { CosmosClientWrapper, CosmosContainerClient } from 'azure-services';
import { GuidGenerator, HashGenerator, ServiceConfiguration, System } from 'common';
import { isEmpty } from 'lodash';
import { ConsoleLoggerClient, GlobalLogger } from 'logger';
import {
    OnDemandPageScanRunResultProvider,
    PartitionKeyFactory,
    RunState,
    ScanResultResponse,
    ScanRunResultResponse,
} from 'service-library';
import { A11yServiceClient, A11yServiceCredential } from 'web-api-client';

import { TestEnvironment } from './common-types';
import { functionalTestGroupTypes, TestGroupName } from './functional-test-group-types';
import { TestRunner } from './runner/test-runner';
import { TestContextData } from './test-group-data';
import { FunctionalTestGroup } from './test-groups/functional-test-group';

// tslint:disable: mocha-no-side-effect-code no-any no-unsafe-any mocha-unneeded-done strict-boolean-expressions

const testIf = (name: string, condition: () => boolean | Promise<boolean>, callback: any) => {
    test(
        name,
        async done => {
            if (await condition()) {
                callback(done);
            } else {
                console.log(`[Functional Test '${name}' Skipped]`);
                done();
            }
        },
        10 * 60 * 1000,
    );
};

describe('functional tests', () => {
    // need to provide by user
    const clientId = process.env.SP_CLIENT_ID || '';
    const clientSecret = process.env.SP_PASSWORD || '';
    const tenantId = process.env.SP_TENANT || '';
    const apimName = process.env.APIM_Name || '';
    const cosmosKey = process.env.COSMOS_DB_KEY || '';
    const cosmosUrl = process.env.COSMOS_DB_URL || '';
    // static values
    const dbName = 'onDemandScanner';
    const collectionName = 'scanRuns';
    const releaseIdStub = 'release-id';
    const runIdStub = 'run-id';

    let consoleLoggerClient: ConsoleLoggerClient;
    let logger: GlobalLogger;
    let cred: A11yServiceCredential;
    let a11yServiceClient: A11yServiceClient;
    let testRunner: TestRunner;
    let guidGenerator: GuidGenerator;
    let testContextData: TestContextData;
    let cosmosClientWrapper: CosmosClientWrapper;
    let cosmosContainerClient: CosmosContainerClient;
    let onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider;

    beforeAll(async () => {
        consoleLoggerClient = new ConsoleLoggerClient(new ServiceConfiguration(), console);
        logger = new GlobalLogger([consoleLoggerClient], process);
        cred = new A11yServiceCredential(clientId, clientSecret, clientId, `https://login.microsoftonline.com/${tenantId}`);
        a11yServiceClient = new A11yServiceClient(cred, `https://apim-${apimName}.azure-api.net`);
        testRunner = new TestRunner(logger);
        guidGenerator = new GuidGenerator();
        cosmosClientWrapper = new CosmosClientWrapper(async () => {
            return new CosmosClient({ endpoint: cosmosUrl, auth: { masterKey: cosmosKey } });
        }, logger);
        cosmosContainerClient = new CosmosContainerClient(cosmosClientWrapper, dbName, collectionName, logger);
        onDemandPageScanRunResultProvider = new OnDemandPageScanRunResultProvider(
            cosmosContainerClient,
            new PartitionKeyFactory(new HashGenerator(), guidGenerator),
        );
        await logger.setup({
            source: 'dev box',
        });
        testRunner.setLogger(logger);
        testContextData = {
            scanUrl: 'https://www.washington.edu/accesscomputing/AU/before.html',
            scanId: '1ea398d9-8688-64e1-c425-63ffb362d8cd',
        };
    });

    // testIf('PostScan', isServiceCredProvided, async (done: jest.DoneCallback) => {
    //     const postScanTests = getTests('PostScan');
    //     await testRunner.run(postScanTests, TestEnvironment.all, releaseIdStub, runIdStub);
    //     done();
    // });

    // testIf('ScanStatus', isServiceCredProvided, async (done: jest.DoneCallback) => {
    //     const scanStatusTests = getTests('ScanStatus');
    //     testContextData.scanId = (await a11yServiceClient.postScanUrl(testContextData.scanUrl)).body[0].scanId;
    //     await testRunner.run(scanStatusTests, TestEnvironment.all, releaseIdStub, runIdStub);
    //     done();
    // });

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

    testIf('ScanReport Snapshot', isServiceCredProvided, async (done: jest.DoneCallback) => {
        const report = (await a11yServiceClient.getScanReport(testContextData.scanId, testContextData.reportId)).body;
        expect(report).toMatchSnapshot();
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
