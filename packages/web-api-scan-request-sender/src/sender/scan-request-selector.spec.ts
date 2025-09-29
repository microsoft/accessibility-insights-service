// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { PageScanRequestProvider, OnDemandPageScanRunResultProvider } from 'service-library';
import { ServiceConfiguration, ScanRunTimeConfig } from 'common';
import { CosmosOperationResponse } from 'azure-services';
import { OnDemandPageScanRequest, OnDemandPageScanResult } from 'storage-documents';
import * as MockDate from 'mockdate';
import { cloneDeep, merge } from 'lodash';
import moment from 'moment';
import { ScanRequestSelector, ScanRequests, DispatchCondition } from './scan-request-selector';

const continuationToken = 'continuationToken1';

let pageScanRequestProviderMock: IMock<PageScanRequestProvider>;
let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
let serviceConfigMock: IMock<ServiceConfiguration>;
let scanRequestSelector: ScanRequestSelector;
let scanRequests: OnDemandPageScanRequest[];
let scanResults: OnDemandPageScanResult[];
let targetQueueRequests: number;
let targetDeleteRequests: number;
let filteredScanRequests: ScanRequests;
let dateNow: Date;

describe(ScanRequestSelector, () => {
    beforeEach(() => {
        dateNow = new Date();
        MockDate.set(dateNow);

        pageScanRequestProviderMock = Mock.ofType<PageScanRequestProvider>();
        onDemandPageScanRunResultProviderMock = Mock.ofType<OnDemandPageScanRunResultProvider>();
        serviceConfigMock = Mock.ofType<ServiceConfiguration>();

        targetQueueRequests = 10;
        targetDeleteRequests = 10;
        scanRequests = [];
        scanResults = [];
        filteredScanRequests = {
            queueRequests: [],
            deleteRequests: [],
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

        const result = await scanRequestSelector.getRequests('privacy', targetQueueRequests, targetDeleteRequests);

        expect(result).toEqual(filteredScanRequests);
    });

    it('queue accepted scan requests with fixed requested count', async () => {
        targetQueueRequests = 3;
        createScanResults([{}, {}, {}, {}, {}]);
        createScanRequests();
        setupPageScanRequestProvider();
        setupOnDemandPageScanRunResultProvider();
        createFilteredScanRequests(
            'accepted',
            scanRequests.map((scanRequest) => scanRequest.id),
        );
        const expectedResult = cloneDeep(filteredScanRequests);
        expectedResult.queueRequests = expectedResult.queueRequests.slice(0, 3);

        const result = await scanRequestSelector.getRequests('privacy', targetQueueRequests, targetDeleteRequests);

        expect(result).toEqual(expectedResult);
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
        targetQueueRequests = scanResults.length;
        createScanRequests();
        setupPageScanRequestProvider();
        setupOnDemandPageScanRunResultProvider();
        createFilteredScanRequests(
            'retry',
            scanRequests.map((scanRequest) => scanRequest.id),
        );

        const result = await scanRequestSelector.getRequests('privacy', targetQueueRequests, targetDeleteRequests);

        expect(result).toEqual(filteredScanRequests);
    });

    it('delete completed scan requests', async () => {
        createScanResults([
            {
                run: { state: 'completed' },
            },
        ]);
        targetQueueRequests = scanResults.length;
        createScanRequests();
        setupPageScanRequestProvider();
        setupOnDemandPageScanRunResultProvider();
        createFilteredScanRequests(
            'completed',
            [],
            scanRequests.map((scanRequest) => scanRequest.id),
        );

        const result = await scanRequestSelector.getRequests('privacy', targetQueueRequests, targetDeleteRequests);

        expect(result).toEqual(filteredScanRequests);
    });

    it('adhere retry delay interval', async () => {
        createScanResults([
            {
                run: {
                    state: 'failed',
                    retryCount: 10,
                    pageResponseCode: 500,
                },
            },
            {
                // ignore due to failedScanRetryIntervalInMinutes delay
                run: {
                    state: 'failed',
                    retryCount: 10,
                    timestamp: moment(dateNow).toJSON(),
                    pageResponseCode: 501,
                },
            },
        ]);
        targetQueueRequests = scanResults.length;
        createScanRequests();
        scanRequests = [scanRequests[0]];

        setupPageScanRequestProvider();
        setupOnDemandPageScanRunResultProvider();
        createFilteredScanRequests(
            'noRetry',
            [],
            scanRequests.map((scanRequest) => scanRequest.id),
        );

        const result = await scanRequestSelector.getRequests('privacy', targetQueueRequests, targetDeleteRequests);

        expect(result).toEqual(filteredScanRequests);
    });

    it('delete failed scans with no retry', async () => {
        createScanResults([
            {
                run: {
                    state: 'failed',
                    retryCount: 10,
                    timestamp: moment(dateNow).add(-12, 'minutes').toJSON(),
                },
            },
        ]);
        targetQueueRequests = scanResults.length;
        createScanRequests();
        setupPageScanRequestProvider();
        setupOnDemandPageScanRunResultProvider();
        createFilteredScanRequests(
            'noRetry',
            [],
            scanRequests.map((scanRequest) => scanRequest.id),
        );

        const result = await scanRequestSelector.getRequests('privacy', targetQueueRequests, targetDeleteRequests);

        expect(result).toEqual(filteredScanRequests);
    });

    it('delete stale scans with no retry', async () => {
        createScanResults([
            {
                run: {
                    state: 'queued',
                    retryCount: 10,
                    timestamp: moment(dateNow).add(-12, 'minutes').toJSON(),
                },
            },
            {
                run: {
                    state: 'running',
                    retryCount: 10,
                    timestamp: moment(dateNow).add(-12, 'minutes').toJSON(),
                },
            },
        ]);
        targetQueueRequests = scanResults.length;
        createScanRequests();
        setupPageScanRequestProvider();
        setupOnDemandPageScanRunResultProvider();
        createFilteredScanRequests(
            'stale',
            [],
            scanRequests.map((scanRequest) => scanRequest.id),
        );

        const result = await scanRequestSelector.getRequests('privacy', targetQueueRequests, targetDeleteRequests);

        expect(result).toEqual(filteredScanRequests);
    });

    it('delete abandon scan', async () => {
        const _ts = moment(dateNow).add(-12, 'minutes').valueOf() / 1000;
        createScanResults([
            {
                run: {
                    state: 'accepted',
                },
                _ts,
            },
            {
                run: {
                    state: 'queued',
                },
                _ts,
            },
            {
                run: {
                    state: 'running',
                },
                _ts,
            },
            {
                run: {
                    state: 'report',
                },
                _ts,
            },
        ]);
        targetQueueRequests = scanResults.length;
        createScanRequests();
        setupPageScanRequestProvider();
        setupOnDemandPageScanRunResultProvider();
        createFilteredScanRequests(
            'abandoned',
            [],
            scanRequests.map((scanRequest) => scanRequest.id),
        );

        const result = await scanRequestSelector.getRequests('privacy', targetQueueRequests, targetDeleteRequests);

        expect(result).toEqual(filteredScanRequests);
    });
});

function createFilteredScanRequests(condition: DispatchCondition, toQueueIds: string[], toDeleteIds: string[] = []): void {
    scanRequests.map((scanRequest) => {
        if (toQueueIds.includes(scanRequest.id)) {
            filteredScanRequests.queueRequests.push({
                request: scanRequest,
                result: scanResults.find((scanResult) => scanResult.id === scanRequest.id),
                condition,
            });
        } else if (toDeleteIds.includes(scanRequest.id)) {
            filteredScanRequests.deleteRequests.push({
                request: scanRequest,
                result: scanResults.find((scanResult) => scanResult.id === scanRequest.id),
                condition,
            });
        }
    });
}

// creates scanRequests array from scanResults array
function createScanRequests(requests: OnDemandPageScanRequest[] = []): void {
    scanRequests = scanResults.map((scanResult) => {
        return {
            id: scanResult.id,
        } as OnDemandPageScanRequest;
    });

    scanRequests.push(...requests);
}

function createScanResults(scans: Partial<OnDemandPageScanResult>[]): void {
    let id = 0;
    scanResults = scans.map((scanResult) => {
        return merge(
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
    scanRequests.slice(0, targetQueueRequests).map((scanRequest) => {
        onDemandPageScanRunResultProviderMock
            .setup((o) => o.readScanRun(scanRequest.id))
            .returns(() => Promise.resolve(scanResults.find((scanResult) => scanResult.id === scanRequest.id)))
            .verifiable();
    });
}

function setupPageScanRequestProvider(): void {
    pageScanRequestProviderMock
        .setup((o) => o.getRequests('privacy', undefined))
        .returns(() =>
            Promise.resolve({
                item: scanRequests.slice(0, targetQueueRequests),
                continuationToken,
                statusCode: 200,
            } as CosmosOperationResponse<OnDemandPageScanRequest[]>),
        )
        .verifiable();

    pageScanRequestProviderMock
        .setup((o) => o.getRequests('privacy', continuationToken))
        .returns(() => Promise.resolve({ item: [], statusCode: 200 } as CosmosOperationResponse<OnDemandPageScanRequest[]>));
}

function setupServiceConfiguration(): void {
    serviceConfigMock
        .setup((o) => o.getConfigValue('scanConfig'))
        .returns(() =>
            Promise.resolve({
                failedScanRetryIntervalInMinutes: 1,
                maxFailedScanRetryCount: 1,
                maxScanStaleTimeoutInMinutes: 10,
            } as ScanRunTimeConfig),
        )
        .verifiable(Times.atLeastOnce());
}
