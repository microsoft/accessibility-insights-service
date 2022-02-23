// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, It, Times } from 'typemoq';
import { PageScanRequestProvider, OnDemandPageScanRunResultProvider } from 'service-library';
import { ServiceConfiguration, ScanRunTimeConfig } from 'common';
import { CosmosOperationResponse } from 'azure-services';
import { OnDemandPageScanRequest, OnDemandPageScanResult, PrivacyScan } from 'storage-documents';
import * as MockDate from 'mockdate';
import _ from 'lodash';
import moment from 'moment';
import { ScanRequestSelector, ScanRequests, DispatchCondition } from './scan-request-selector';

const continuationToken = 'continuationToken1';

let pageScanRequestProviderMock: IMock<PageScanRequestProvider>;
let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
let serviceConfigMock: IMock<ServiceConfiguration>;
let scanRequestSelector: ScanRequestSelector;
let scanRequests: OnDemandPageScanRequest[];
let scanResults: OnDemandPageScanResult[];
let accessibilityMessageCount: number;
let privacyMessageCount: number;
let filteredScanRequests: ScanRequests;
let dateNow: Date;

describe(ScanRequestSelector, () => {
    beforeEach(() => {
        dateNow = new Date();
        MockDate.set(dateNow);

        pageScanRequestProviderMock = Mock.ofType<PageScanRequestProvider>();
        onDemandPageScanRunResultProviderMock = Mock.ofType<OnDemandPageScanRunResultProvider>();
        serviceConfigMock = Mock.ofType<ServiceConfiguration>();

        accessibilityMessageCount = 10;
        privacyMessageCount = 10;
        scanRequests = [];
        scanResults = [];
        filteredScanRequests = {
            accessibilityRequestsToQueue: [],
            privacyRequestsToQueue: [],
            requestsToDelete: [],
        };

        scanRequestSelector = new ScanRequestSelector(
            pageScanRequestProviderMock.object,
            onDemandPageScanRunResultProviderMock.object,
            serviceConfigMock.object,
        );

        setupServiceConfiguration();
    });

    afterEach(() => {
        MockDate.reset();

        pageScanRequestProviderMock.verifyAll();
        onDemandPageScanRunResultProviderMock.verifyAll();
        serviceConfigMock.verifyAll();
    });

    it('no op', async () => {
        setupPageScanRequestProvider();

        const result = await scanRequestSelector.getRequests(accessibilityMessageCount, privacyMessageCount);

        expect(result).toEqual(filteredScanRequests);
    });

    it('queue accepted scan requests with fixed requested count', async () => {
        accessibilityMessageCount = 3;
        createScanResults([{}, {}, {}, {}, {}]);
        createScanRequests();
        setupPageScanRequestProvider();
        setupOnDemandPageScanRunResultProvider();
        createFilteredScanRequests(
            'accepted',
            scanRequests.map((scanRequest) => scanRequest.id),
        );
        const expectedResult = _.cloneDeep(filteredScanRequests);
        expectedResult.accessibilityRequestsToQueue = expectedResult.accessibilityRequestsToQueue.slice(0, 3);

        const result = await scanRequestSelector.getRequests(accessibilityMessageCount, privacyMessageCount);

        expect(result).toEqual(expectedResult);
    });

    it('queue with privacy scan requests', async () => {
        createScanResults([
            {},
            {
                privacyScan: {} as PrivacyScan,
            },
            {
                privacyScan: {} as PrivacyScan,
            },
        ]);
        accessibilityMessageCount = 1;
        privacyMessageCount = 2;
        createScanRequests();
        setupPageScanRequestProvider();
        setupOnDemandPageScanRunResultProvider();
        createFilteredScanRequests(
            'accepted',
            scanRequests.map((scanRequest) => scanRequest.id),
        );

        const result = await scanRequestSelector.getRequests(accessibilityMessageCount, privacyMessageCount);

        expect(result).toEqual(filteredScanRequests);
    });

    it('queue failed with retry scan requests', async () => {
        createScanResults([
            {
                run: { state: 'queued' },
            },
            {
                run: { state: 'running' },
            },
            {
                run: { state: 'failed' },
            },
        ]);
        accessibilityMessageCount = scanResults.length;
        createScanRequests();
        setupPageScanRequestProvider();
        setupOnDemandPageScanRunResultProvider();
        createFilteredScanRequests(
            'retry',
            scanRequests.map((scanRequest) => scanRequest.id),
        );

        const result = await scanRequestSelector.getRequests(accessibilityMessageCount, privacyMessageCount);

        expect(result).toEqual(filteredScanRequests);
    });

    it('delete completed scan requests', async () => {
        createScanResults([
            {
                run: { state: 'completed' },
            },
        ]);
        accessibilityMessageCount = scanResults.length;
        createScanRequests();
        setupPageScanRequestProvider();
        setupOnDemandPageScanRunResultProvider();
        createFilteredScanRequests(
            'completed',
            [],
            scanRequests.map((scanRequest) => scanRequest.id),
        );

        const result = await scanRequestSelector.getRequests(accessibilityMessageCount, privacyMessageCount);

        expect(result).toEqual(filteredScanRequests);
    });

    it('delete completed and no-retry scan requests', async () => {
        createScanResults([
            {
                run: {
                    state: 'queued',
                    retryCount: 10,
                },
            },
        ]);
        accessibilityMessageCount = scanResults.length;
        createScanRequests();
        setupPageScanRequestProvider();
        setupOnDemandPageScanRunResultProvider();
        createFilteredScanRequests(
            'noRetry',
            [],
            scanRequests.map((scanRequest) => scanRequest.id),
        );

        const result = await scanRequestSelector.getRequests(accessibilityMessageCount, privacyMessageCount);

        expect(result).toEqual(filteredScanRequests);
    });
});

function createFilteredScanRequests(condition: DispatchCondition, toQueueIds: string[], toDeleteIds: string[] = []): void {
    scanRequests.map((scanRequest) => {
        if (toQueueIds.includes(scanRequest.id)) {
            if (scanRequest.privacyScan) {
                filteredScanRequests.privacyRequestsToQueue.push({
                    request: scanRequest,
                    result: scanResults.find((scanResult) => scanResult.id === scanRequest.id),
                    condition,
                });
            } else {
                filteredScanRequests.accessibilityRequestsToQueue.push({
                    request: scanRequest,
                    result: scanResults.find((scanResult) => scanResult.id === scanRequest.id),
                    condition,
                });
            }
        } else if (toDeleteIds.includes(scanRequest.id)) {
            filteredScanRequests.requestsToDelete.push({
                request: scanRequest,
                condition,
            });
        }
    });
}

// creates off scanResults array
function createScanRequests(requests: OnDemandPageScanRequest[] = []): void {
    scanRequests = scanResults.map((scanResult) => {
        return {
            id: scanResult.id,
            privacyScan: scanResult.privacyScan,
        } as OnDemandPageScanRequest;
    });

    scanRequests.push(...requests);
}

function createScanResults(scans: Partial<OnDemandPageScanResult>[]): void {
    let id = 0;
    scanResults = scans.map((scanResult) => {
        return _.merge(
            {
                id: ++id,
                run: {
                    state: 'accepted',
                    retryCount: 0,
                    timestamp: moment.utc().add(-2, 'minutes').toJSON(),
                },
            },
            scanResult,
        ) as OnDemandPageScanResult;
    });
}

function setupOnDemandPageScanRunResultProvider(): void {
    scanRequests.slice(0, accessibilityMessageCount + privacyMessageCount).map((scanRequest) => {
        onDemandPageScanRunResultProviderMock
            .setup((o) => o.readScanRun(scanRequest.id))
            .returns(() => Promise.resolve(scanResults.find((scanResult) => scanResult.id === scanRequest.id)))
            .verifiable();
    });
}

function setupPageScanRequestProvider(): void {
    pageScanRequestProviderMock
        .setup((o) => o.getRequests(undefined, (accessibilityMessageCount + privacyMessageCount) * 10))
        .returns(() =>
            Promise.resolve({
                item: scanRequests.slice(0, accessibilityMessageCount + privacyMessageCount),
                continuationToken,
                statusCode: 200,
            } as CosmosOperationResponse<OnDemandPageScanRequest[]>),
        )
        .verifiable();

    if (accessibilityMessageCount + privacyMessageCount >= scanRequests.length) {
        pageScanRequestProviderMock
            .setup((o) => o.getRequests(continuationToken, It.isAnyNumber()))
            .returns(() => Promise.resolve({ item: [], statusCode: 200 } as CosmosOperationResponse<OnDemandPageScanRequest[]>));
    }
}

function setupServiceConfiguration(): void {
    serviceConfigMock
        .setup((o) => o.getConfigValue('scanConfig'))
        .returns(() =>
            Promise.resolve({
                failedScanRetryIntervalInMinutes: 1,
                maxFailedScanRetryCount: 1,
            } as ScanRunTimeConfig),
        )
        .verifiable(Times.atLeastOnce());
}
