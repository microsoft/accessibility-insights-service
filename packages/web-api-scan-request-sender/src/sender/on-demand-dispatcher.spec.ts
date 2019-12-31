// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { CosmosOperationResponse, SystemConfig } from 'azure-services';
import { Logger } from 'logger';
import { PageScanRequestProvider } from 'service-library';
import { OnDemandPageScanRequest } from 'storage-documents';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { QueueSizeGenerator } from '../queue-size-generator';
import { OnDemandDispatcher } from './on-demand-dispatcher';
import { OnDemandScanRequestSender } from './on-demand-scan-request-sender';

// tslint:disable: no-any no-unsafe-any no-object-literal-type-assertion no-null-keyword

export class MockableLogger extends Logger {}

interface QueryDataProviderStubResponse<T> {
    continuationToken: string;
    data: T[];
}

class QueryDataProviderStub<T> {
    private readonly data: T[];
    private currentStartPos: number;
    private readonly maxItemsPerRequest: number;

    constructor(data: T[], chunkCount: number) {
        this.data = data;
        this.currentStartPos = 0;
        this.maxItemsPerRequest = chunkCount;
    }

    public getNextDataChunk(): QueryDataProviderStubResponse<T> {
        const endPos = this.currentStartPos + this.maxItemsPerRequest;
        const currentChunk = this.data.slice(this.currentStartPos, endPos);
        this.currentStartPos = endPos;

        return {
            continuationToken: this.currentStartPos >= this.data.length ? undefined : `token - ${this.currentStartPos}`,
            data: currentChunk,
        };
    }
}

describe('Dispatcher', () => {
    const maxQueueSize = 10;
    let currentQueueSize: number;
    let loggerMock: IMock<MockableLogger>;
    let pageScanRequestProviderMock: IMock<PageScanRequestProvider>;
    let onDemandScanRequestSenderMock: IMock<OnDemandScanRequestSender>;
    let dispatcher: OnDemandDispatcher;
    let queueSizeGeneratorMock: IMock<QueueSizeGenerator>;
    let systemConfigStub: SystemConfig;

    beforeEach(() => {
        currentQueueSize = 1;
        systemConfigStub = {
            storageName: 'storage-name',
            scanQueue: 'scan-queue',
            batchAccountName: 'batch-account-name',
        };

        queueSizeGeneratorMock = Mock.ofType(QueueSizeGenerator);
        queueSizeGeneratorMock
            .setup(async o => o.getTargetQueueSize(It.isAny()))
            .returns(async () => Promise.resolve(maxQueueSize))
            .verifiable();

        loggerMock = Mock.ofType(MockableLogger);
        pageScanRequestProviderMock = Mock.ofType(PageScanRequestProvider);
        onDemandScanRequestSenderMock = Mock.ofType(OnDemandScanRequestSender, MockBehavior.Strict);
        dispatcher = new OnDemandDispatcher(
            pageScanRequestProviderMock.object,
            onDemandScanRequestSenderMock.object,
            queueSizeGeneratorMock.object,
            loggerMock.object,
        );
    });

    function verifyAll(): void {
        pageScanRequestProviderMock.verifyAll();
        onDemandScanRequestSenderMock.verifyAll();
        loggerMock.verifyAll();
        queueSizeGeneratorMock.verifyAll();
    }

    test.each([maxQueueSize, maxQueueSize + 1])(
        'does nothing if current queue size is greater than max queue size - current queue size - %o',
        async (queueSize: number) => {
            currentQueueSize = queueSize;
            setupVerifiableQueueSizeCall();
            setupPageDocumentProviderNotCalled();
            setupVerifiableScanRequestNotCalled();
            loggerMock.setup(o => o.logWarn(It.isAny())).verifiable(Times.once());

            await dispatcher.dispatchOnDemandScanRequests();

            verifyAll();
        },
    );

    it('does not call scan request if no pages to add', async () => {
        setupVerifiableQueueSizeCall();
        const queryDataProviderStub = new QueryDataProviderStub<OnDemandPageScanRequest>([], 5);
        setupReadyToScanPageForAllPages([queryDataProviderStub]);
        setupVerifiableScanRequestNotCalled();

        await dispatcher.dispatchOnDemandScanRequests();

        verifyAll();
    });

    it('sends requests when total ready to scan pages < current queue size', async () => {
        const initialQueueSize = 1;
        currentQueueSize = 1;
        setupVerifiableQueueSizeCall();
        const allPages = getOnDemandRequests(maxQueueSize - 2);

        const queryDataProviderStub1 = new QueryDataProviderStub<OnDemandPageScanRequest>(allPages, 2);
        const queryDataProviderStub2 = new QueryDataProviderStub<OnDemandPageScanRequest>([], 2);

        setupReadyToScanPageForAllPages([queryDataProviderStub1, queryDataProviderStub2]);
        loggerMock.setup(lm => lm.trackEvent('ScanRequestQueued', null, { queuedRequests: 2 })).verifiable(Times.exactly(4));

        await dispatcher.dispatchOnDemandScanRequests();

        expect(currentQueueSize).toBe(initialQueueSize + allPages.length);
        verifyAll();
    });

    it('sends requests when total ready to scan pages > current queue size', async () => {
        const initialQueueSize = 1;
        currentQueueSize = 1;
        setupVerifiableQueueSizeCall();
        const allPages = getOnDemandRequests(maxQueueSize + 1);

        const queryDataProviderStub1 = new QueryDataProviderStub<OnDemandPageScanRequest>(allPages.slice(0, allPages.length / 2), 2);
        const queryDataProviderStub2 = new QueryDataProviderStub<OnDemandPageScanRequest>(
            allPages.slice(allPages.length / 2, allPages.length),
            2,
        );

        setupReadyToScanPageForAllPages([queryDataProviderStub1, queryDataProviderStub2]);

        await dispatcher.dispatchOnDemandScanRequests();
        expect(currentQueueSize).toBe(initialQueueSize + allPages.length);

        verifyAll();
    });

    it('sends requests when total ready to scan pages = current queue size', async () => {
        const initialQueueSize = 1;
        currentQueueSize = 1;
        setupVerifiableQueueSizeCall();
        const allPages = getOnDemandRequests(maxQueueSize - currentQueueSize);

        const queryDataProviderStub1 = new QueryDataProviderStub<OnDemandPageScanRequest>(allPages.slice(0, allPages.length / 2), 2);
        const queryDataProviderStub2 = new QueryDataProviderStub<OnDemandPageScanRequest>(
            allPages.slice(allPages.length / 2, allPages.length),
            2,
        );

        setupReadyToScanPageForAllPages([queryDataProviderStub1, queryDataProviderStub2]);

        await dispatcher.dispatchOnDemandScanRequests();
        expect(currentQueueSize).toBe(initialQueueSize + allPages.length);

        verifyAll();
    });

    it('error while retrieving documents', async () => {
        setupVerifiableQueueSizeCall();

        pageScanRequestProviderMock
            .setup(async p => p.getRequests(It.isAny()))
            .returns(async () => Promise.resolve(getErrorResponse()))
            .verifiable(Times.once());

        await expect(dispatcher.dispatchOnDemandScanRequests()).rejects.toThrowError(/Failed request response/);
        pageScanRequestProviderMock.verifyAll();
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

    function setupReadyToScanPageForAllPages(dataProviders: QueryDataProviderStub<OnDemandPageScanRequest>[]): void {
        dataProviders.forEach(dataProvider => {
            let previousContinuationToken;

            do {
                const response = dataProvider.getNextDataChunk();

                setupGetReadyToScanPagesCallForChunk(response.data, previousContinuationToken, response.continuationToken);

                if (response.data.length > 0) {
                    setupVerifiableScanRequestCallForChunk(response.data);
                }

                previousContinuationToken = response.continuationToken;
            } while (previousContinuationToken !== undefined);
        });
    }

    function setupVerifiableScanRequestCallForChunk(onDemandPageScanRequests: OnDemandPageScanRequest[]): void {
        onDemandScanRequestSenderMock
            .setup(async s => s.sendRequestToScan(onDemandPageScanRequests))
            .returns(async () => {
                currentQueueSize += onDemandPageScanRequests.length;
            })
            .verifiable(Times.once());
    }

    function setupGetReadyToScanPagesCallForChunk(
        onDemandPageScanRequests: OnDemandPageScanRequest[],
        previousContinuationToken: string,
        continuationToken: string,
    ): void {
        pageScanRequestProviderMock
            .setup(async p => p.getRequests(previousContinuationToken))
            .returns(async () => Promise.resolve(createOnDemandPagesRequestResponse(onDemandPageScanRequests, continuationToken)));
    }

    function setupPageDocumentProviderNotCalled(): void {
        pageScanRequestProviderMock.setup(async p => p.getRequests(It.isAny())).verifiable(Times.never());
    }

    function setupVerifiableQueueSizeCall(): void {
        onDemandScanRequestSenderMock
            .setup(async s => s.getCurrentQueueSize())
            .returns(async () => Promise.resolve(currentQueueSize))
            .verifiable(Times.atLeastOnce());
    }

    function setupVerifiableScanRequestNotCalled(): void {
        onDemandScanRequestSenderMock.setup(async s => s.sendRequestToScan(It.isAny())).verifiable(Times.never());
    }

    function getErrorResponse(): CosmosOperationResponse<OnDemandPageScanRequest[]> {
        return <CosmosOperationResponse<OnDemandPageScanRequest[]>>{
            type: 'CosmosOperationResponse<OnDemandPageScanRequest>',
            statusCode: 500,
            item: <OnDemandPageScanRequest[]>undefined,
        };
    }
});
