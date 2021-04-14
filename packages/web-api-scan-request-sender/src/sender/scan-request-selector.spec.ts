// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { IMock, Mock, It, Times } from 'typemoq';
import { PageScanRequestProvider, OnDemandPageScanRunResultProvider } from 'service-library';
import { ServiceConfiguration, ScanRunTimeConfig } from 'common';
import { Logger } from 'logger';
import { CosmosOperationResponse } from 'azure-services';
import { OnDemandPageScanRequest, OnDemandPageScanResult } from 'storage-documents';
import * as MockDate from 'mockdate';
import _ from 'lodash';
import { ScanRequestSelector, ScanRequests } from './scan-request-selector';

const continuationToken = 'continuationToken1';

let pageScanRequestProviderMock: IMock<PageScanRequestProvider>;
let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
let serviceConfigMock: IMock<ServiceConfiguration>;
let loggerMock: IMock<Logger>;
let scanRequestSelector: ScanRequestSelector;
let scanRequests: OnDemandPageScanRequest[];
let scanResults: OnDemandPageScanResult[];
let itemsCount: number;
let filteredScanRequests: ScanRequests;
let dateNow: Date;

describe(ScanRequestSelector, () => {
    beforeAll(() => {
        dateNow = new Date();
        MockDate.set(dateNow);

        pageScanRequestProviderMock = Mock.ofType<PageScanRequestProvider>();
        onDemandPageScanRunResultProviderMock = Mock.ofType<OnDemandPageScanRunResultProvider>();
        serviceConfigMock = Mock.ofType<ServiceConfiguration>();
        loggerMock = Mock.ofType<Logger>();

        itemsCount = 10;
        scanRequests = [];
        scanResults = [];
        filteredScanRequests = {
            toQueue: [],
            toDelete: [],
        };

        scanRequestSelector = new ScanRequestSelector(
            pageScanRequestProviderMock.object,
            onDemandPageScanRunResultProviderMock.object,
            serviceConfigMock.object,
            loggerMock.object,
        );

        setupServiceConfiguration();
    });

    afterAll(() => {
        MockDate.reset();

        pageScanRequestProviderMock.verifyAll();
        onDemandPageScanRunResultProviderMock.verifyAll();
        serviceConfigMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('no op', async () => {
        setupPageScanRequestProvider();

        const result = await scanRequestSelector.getRequests(itemsCount);

        expect(result).toEqual(filteredScanRequests);
    });

    it('return accepted scan requests', async () => {
        itemsCount = 3;
        createScanResults([{}, {}, {}, {}, {}]);
        createScanRequests();
        setupPageScanRequestProvider();
        setupOnDemandPageScanRunResultProvider();

        createFilteredScanRequests(scanRequests.map((scanRequest) => scanRequest.id));
        const expectedResult = _.cloneDeep(filteredScanRequests);
        expectedResult.toQueue = expectedResult.toQueue.slice(0, 3);

        const result = await scanRequestSelector.getRequests(itemsCount);

        expect(result).toEqual(expectedResult);
    });
});

function createFilteredScanRequests(toQueueIds: string[], toDeleteIds: string[] = []): void {
    scanRequests.map((scanRequest) => {
        if (toQueueIds.includes(scanRequest.id)) {
            filteredScanRequests.toQueue.push({
                request: scanRequest,
                result: scanResults.find((scanResult) => scanResult.id === scanRequest.id),
            });
        } else if (toDeleteIds.includes(scanRequest.id)) {
            filteredScanRequests.toDelete.push({
                request: scanRequest,
            });
        }
    });
}

// creates off scanResults array
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
        return {
            id: ++id,
            run: {
                state: 'accepted',
                retryCount: 0,
                timestamp: dateNow.toJSON(),
            },
            ...scanResult,
        } as OnDemandPageScanResult;
    });
}

function setupOnDemandPageScanRunResultProvider(): void {
    scanRequests.slice(0, itemsCount).map((scanRequest) => {
        onDemandPageScanRunResultProviderMock
            .setup((o) => o.readScanRun(scanRequest.id))
            .returns(() => Promise.resolve(scanResults.find((scanResult) => scanResult.id === scanRequest.id)))
            .verifiable();
    });
}

function setupPageScanRequestProvider(): void {
    pageScanRequestProviderMock
        .setup((o) => o.getRequests(undefined, itemsCount))
        .returns(() =>
            Promise.resolve({
                item: scanRequests.slice(0, itemsCount),
                continuationToken,
                statusCode: 200,
            } as CosmosOperationResponse<OnDemandPageScanRequest[]>),
        )
        .verifiable();

    if (itemsCount > scanRequests.length) {
        pageScanRequestProviderMock
            .setup((o) => o.getRequests(continuationToken, It.isAnyNumber()))
            .returns(() => Promise.resolve({ item: [], statusCode: 200 } as CosmosOperationResponse<OnDemandPageScanRequest[]>))
            .verifiable();
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
