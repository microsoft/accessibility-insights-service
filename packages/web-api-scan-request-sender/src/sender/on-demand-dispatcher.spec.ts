// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions */
import 'reflect-metadata';

import { CosmosOperationResponse } from 'azure-services';
import { QueueRuntimeConfig, ServiceConfiguration } from 'common';
import { Logger } from 'logger';
import { PageScanRequestProvider } from 'service-library';
import { OnDemandPageScanRequest } from 'storage-documents';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { OnDemandDispatcher } from './on-demand-dispatcher';
import { OnDemandScanRequestSender } from './on-demand-scan-request-sender';

export class MockableLogger extends Logger {}

interface QueryDataProviderStubResponse<T> {
    continuationToken: string;
    items: T[];
}

class QueryDataProviderStub<T> {
    private nextChunkIndex = 0;
    private currentItemPos = 0;

    constructor(private readonly items: T[], private readonly itemsPerNextChunk: number[]) {}

    public reset(): void {
        this.nextChunkIndex = 0;
        this.currentItemPos = 0;
    }

    public getNextDataChunk(): QueryDataProviderStubResponse<T> {
        if (this.itemsPerNextChunk.length < this.nextChunkIndex + 1) {
            return {
                continuationToken: undefined,
                items: [],
            };
        }

        const currentChunk = this.items.slice(this.currentItemPos, this.currentItemPos + this.itemsPerNextChunk[this.nextChunkIndex]);
        this.currentItemPos += this.itemsPerNextChunk[this.nextChunkIndex];
        this.nextChunkIndex += 1;

        return {
            continuationToken:
                this.currentItemPos >= this.items.length
                    ? undefined
                    : `next chunk [${this.currentItemPos}:${this.currentItemPos + this.itemsPerNextChunk[this.nextChunkIndex]}]`,
            items: currentChunk,
        };
    }
}

describe('Dispatcher', () => {
    let loggerMock: IMock<MockableLogger>;
    let pageScanRequestProvider: IMock<PageScanRequestProvider>;
    let scanRequestSenderMock: IMock<OnDemandScanRequestSender>;
    let dispatcher: OnDemandDispatcher;
    let serviceConfigMock: IMock<ServiceConfiguration>;
    const maxQueueSize = 10;
    let currentQueueSize: number;

    beforeEach(() => {
        currentQueueSize = 1;
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        serviceConfigMock
            .setup(async (s) => s.getConfigValue('queueConfig'))
            .returns(async () => Promise.resolve({ maxQueueSize: maxQueueSize } as QueueRuntimeConfig));

        loggerMock = Mock.ofType(MockableLogger);
        pageScanRequestProvider = Mock.ofType(PageScanRequestProvider);
        scanRequestSenderMock = Mock.ofType(OnDemandScanRequestSender, MockBehavior.Strict);
        dispatcher = new OnDemandDispatcher(
            pageScanRequestProvider.object,
            loggerMock.object,
            scanRequestSenderMock.object,
            serviceConfigMock.object,
        );
    });

    function verifyAll(): void {
        pageScanRequestProvider.verifyAll();
        scanRequestSenderMock.verifyAll();
        loggerMock.verifyAll();
    }

    test.each([maxQueueSize, maxQueueSize + 1])(
        'does nothing if current queue size is greater than max queue size - current queue size - %o',
        async (queueSize: number) => {
            currentQueueSize = queueSize;
            setupVerifiableQueueSizeCall();
            setupPageScanRequestProviderNotCalled();
            setupVerifiableScanRequestNotCalled();
            loggerMock.setup((o) => o.logWarn(It.isAny())).verifiable(Times.once());

            await dispatcher.dispatchScanRequests();

            verifyAll();
        },
    );

    it('does not call scan request if no pages to add', async () => {
        setupVerifiableQueueSizeCall();
        const queryDataProviderStub = new QueryDataProviderStub<OnDemandPageScanRequest>([], []);
        setupReadyToScanPageForAllPages(queryDataProviderStub);
        setupVerifiableScanRequestNotCalled();

        await dispatcher.dispatchScanRequests();

        verifyAll();
    });

    it('sends requests when total ready to scan pages < current queue size', async () => {
        const initialQueueSize = 1;
        currentQueueSize = 1;
        setupVerifiableQueueSizeCall();
        const allPages = getOnDemandRequests(maxQueueSize - 2);
        const itemsPerChunk = allPages.length / 2;

        const queryDataProviderStub = new QueryDataProviderStub<OnDemandPageScanRequest>(allPages, [
            itemsPerChunk + 1,
            0,
            itemsPerChunk - 1,
        ]);

        setupReadyToScanPageForAllPages(queryDataProviderStub);

        await dispatcher.dispatchScanRequests();

        expect(currentQueueSize).toBe(initialQueueSize + allPages.length);
        verifyAll();
    });

    it('sends requests when total ready to scan pages > current queue size', async () => {
        const initialQueueSize = 1;
        currentQueueSize = 1;
        setupVerifiableQueueSizeCall();
        const allPages = getOnDemandRequests(maxQueueSize + 2);
        const itemsPerChunk = allPages.length / 2;

        const queryDataProviderStub = new QueryDataProviderStub<OnDemandPageScanRequest>(allPages, [
            itemsPerChunk + 1,
            0,
            itemsPerChunk - 1,
        ]);

        setupReadyToScanPageForAllPages(queryDataProviderStub);

        await dispatcher.dispatchScanRequests();
        expect(currentQueueSize).toBe(initialQueueSize + allPages.length);

        verifyAll();
    });

    it('sends requests when total ready to scan pages = current queue size', async () => {
        const initialQueueSize = 1;
        currentQueueSize = 1;
        setupVerifiableQueueSizeCall();
        const allPages = getOnDemandRequests(maxQueueSize - currentQueueSize);
        const itemsPerChunk = allPages.length / 2;

        const queryDataProviderStub = new QueryDataProviderStub<OnDemandPageScanRequest>(allPages, [
            itemsPerChunk + 1,
            0,
            itemsPerChunk - 1,
        ]);

        setupReadyToScanPageForAllPages(queryDataProviderStub);

        await dispatcher.dispatchScanRequests();
        expect(currentQueueSize).toBe(initialQueueSize + allPages.length);

        verifyAll();
    });

    it('error while retrieving documents', async () => {
        setupVerifiableQueueSizeCall();

        pageScanRequestProvider
            .setup(async (p) => p.getRequests(It.isAny(), It.isAny()))
            .returns(async () => Promise.resolve(getErrorResponse()))
            .verifiable(Times.once());

        await expect(dispatcher.dispatchScanRequests()).rejects.toThrowError(/Failed request response/);
        pageScanRequestProvider.verifyAll();
    });

    function getOnDemandRequests(count: number): OnDemandPageScanRequest[] {
        const onDemandPageScanRequests: OnDemandPageScanRequest[] = [];

        for (let i = 0; i < count; i += 1) {
            onDemandPageScanRequests.push({
                id: `onDemandPageScanRequests-${i}`,
            } as OnDemandPageScanRequest);
        }

        return onDemandPageScanRequests;
    }

    function createOnDemandPagesRequestResponse(
        onDemandPageScanRequests: OnDemandPageScanRequest[],
        continuationToken?: string,
    ): CosmosOperationResponse<OnDemandPageScanRequest[]> {
        return {
            type: 'CosmosOperationResponse<OnDemandPageScanRequest>',
            statusCode: 200,
            item: onDemandPageScanRequests,
            continuationToken: continuationToken,
        } as CosmosOperationResponse<OnDemandPageScanRequest[]>;
    }

    function setupReadyToScanPageForAllPages(dataProvider: QueryDataProviderStub<OnDemandPageScanRequest>): void {
        let response;
        let previousContinuationToken;
        let expectedItemsCount = maxQueueSize - currentQueueSize;

        do {
            response = dataProvider.getNextDataChunk();

            setupGetReadyToScanPagesCallForChunk(response.items, previousContinuationToken, response.continuationToken, expectedItemsCount);

            if (response.items.length > 0) {
                setupVerifiableScanRequestCallForChunk(response.items);
                setupLoggerTrackEvent(response.items.length);
            }

            if (response.continuationToken === undefined) {
                break;
            }

            expectedItemsCount -= response.items.length;
            previousContinuationToken = response.continuationToken;
        } while (response.continuationToken !== undefined);

        dataProvider.reset();
    }

    function setupVerifiableScanRequestCallForChunk(onDemandPageScanRequests: OnDemandPageScanRequest[]): void {
        scanRequestSenderMock
            .setup(async (s) => s.sendRequestToScan(onDemandPageScanRequests))
            .returns(async () => {
                currentQueueSize += onDemandPageScanRequests.length;
            })
            .verifiable(Times.once());
    }

    function setupGetReadyToScanPagesCallForChunk(
        onDemandPageScanRequests: OnDemandPageScanRequest[],
        previousContinuationToken: string,
        continuationToken: string,
        expectedItemsCount: number,
    ): void {
        pageScanRequestProvider
            .setup(async (p) => p.getRequests(previousContinuationToken, expectedItemsCount))
            .returns(async () => Promise.resolve(createOnDemandPagesRequestResponse(onDemandPageScanRequests, continuationToken)));
    }

    function setupLoggerTrackEvent(itemCount: number): void {
        loggerMock
            .setup((lm) => lm.trackEvent('ScanRequestQueued', null, It.isValue({ queuedScanRequests: itemCount })))
            .verifiable(Times.once());
    }

    function setupPageScanRequestProviderNotCalled(): void {
        pageScanRequestProvider.setup(async (p) => p.getRequests(It.isAny(), It.isAny())).verifiable(Times.never());
    }

    function setupVerifiableQueueSizeCall(): void {
        scanRequestSenderMock
            .setup(async (s) => s.getCurrentQueueSize())
            .returns(async () => Promise.resolve(currentQueueSize))
            .verifiable(Times.atLeastOnce());
    }

    function setupVerifiableScanRequestNotCalled(): void {
        scanRequestSenderMock.setup(async (s) => s.sendRequestToScan(It.isAny())).verifiable(Times.never());
    }

    function getErrorResponse(): CosmosOperationResponse<OnDemandPageScanRequest[]> {
        return <CosmosOperationResponse<OnDemandPageScanRequest[]>>{
            type: 'CosmosOperationResponse<OnDemandPageScanRequest>',
            statusCode: 500,
            item: <OnDemandPageScanRequest[]>undefined,
        };
    }
});
