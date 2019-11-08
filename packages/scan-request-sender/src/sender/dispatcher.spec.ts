// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-import-side-effect no-any no-unsafe-any no-object-literal-type-assertion
import 'reflect-metadata';

import { CosmosOperationResponse } from 'azure-services';
import { QueueRuntimeConfig, ServiceConfiguration } from 'common';
import { Logger } from 'logger';
import { PageDocumentProvider } from 'service-library';
import { WebsitePage } from 'storage-documents';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { Dispatcher } from './dispatcher';
import { ScanRequestSender } from './scan-request-sender';

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
    let loggerMock: IMock<Logger>;
    let pageDocumentProviderMock: IMock<PageDocumentProvider>;
    let scanRequestSenderMock: IMock<ScanRequestSender>;
    let dispatcher: Dispatcher;
    let serviceConfigMock: IMock<ServiceConfiguration>;
    const maxQueueSize = 10;
    let currentQueueSize: number;

    beforeEach(() => {
        currentQueueSize = 1;
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        serviceConfigMock
            .setup(async s => s.getConfigValue('queueConfig'))
            .returns(async () => Promise.resolve({ maxQueueSize: maxQueueSize } as QueueRuntimeConfig));

        loggerMock = Mock.ofType(Logger);
        pageDocumentProviderMock = Mock.ofType(PageDocumentProvider);
        scanRequestSenderMock = Mock.ofType(ScanRequestSender, MockBehavior.Strict);
        dispatcher = new Dispatcher(
            pageDocumentProviderMock.object,
            loggerMock.object,
            scanRequestSenderMock.object,
            serviceConfigMock.object,
        );
    });

    function verifyAll(): void {
        pageDocumentProviderMock.verifyAll();
        scanRequestSenderMock.verifyAll();
        loggerMock.verifyAll();
    }

    test.each([maxQueueSize, maxQueueSize + 1])(
        'does nothing if current queue size is greater than max queue size - current queue size - %o',
        async (queueSize: number) => {
            currentQueueSize = queueSize;
            setupVerifiableQueueSizeCall();
            setupPageDocumentProviderNotCalled();
            setupVerifiableScanRequestNotCalled();
            loggerMock.setup(o => o.logWarn(It.isAny())).verifiable(Times.once());

            await dispatcher.dispatchScanRequests();

            verifyAll();
        },
    );

    it('does not call scan request if no pages to add', async () => {
        setupVerifiableQueueSizeCall();
        const queryDataProviderStub = new QueryDataProviderStub<WebsitePage>([], 5);
        setupReadyToScanPageForAllPages([queryDataProviderStub]);
        setupVerifiableScanRequestNotCalled();

        await dispatcher.dispatchScanRequests();

        verifyAll();
    });

    it('sends requests when total ready to scan pages < current queue size', async () => {
        const initialQueueSize = 1;
        currentQueueSize = 1;
        setupVerifiableQueueSizeCall();
        const allPages = getWebPages(maxQueueSize - 2);

        const queryDataProviderStub1 = new QueryDataProviderStub<WebsitePage>(allPages, 2);
        const queryDataProviderStub2 = new QueryDataProviderStub<WebsitePage>([], 2);

        setupReadyToScanPageForAllPages([queryDataProviderStub1, queryDataProviderStub2]);

        await dispatcher.dispatchScanRequests();

        expect(currentQueueSize).toBe(initialQueueSize + allPages.length);
        verifyAll();
    });

    it('sends requests when total ready to scan pages > current queue size', async () => {
        const initialQueueSize = 1;
        currentQueueSize = 1;
        setupVerifiableQueueSizeCall();
        const allPages = getWebPages(maxQueueSize + 1);

        const queryDataProviderStub1 = new QueryDataProviderStub<WebsitePage>(allPages.slice(0, allPages.length / 2), 2);
        const queryDataProviderStub2 = new QueryDataProviderStub<WebsitePage>(allPages.slice(allPages.length / 2, allPages.length), 2);

        setupReadyToScanPageForAllPages([queryDataProviderStub1, queryDataProviderStub2]);

        await dispatcher.dispatchScanRequests();
        expect(currentQueueSize).toBe(initialQueueSize + allPages.length);

        verifyAll();
    });

    it('sends requests when total ready to scan pages = current queue size', async () => {
        const initialQueueSize = 1;
        currentQueueSize = 1;
        setupVerifiableQueueSizeCall();
        const allPages = getWebPages(maxQueueSize - currentQueueSize);

        const queryDataProviderStub1 = new QueryDataProviderStub<WebsitePage>(allPages.slice(0, allPages.length / 2), 2);
        const queryDataProviderStub2 = new QueryDataProviderStub<WebsitePage>(allPages.slice(allPages.length / 2, allPages.length), 2);

        setupReadyToScanPageForAllPages([queryDataProviderStub1, queryDataProviderStub2]);

        await dispatcher.dispatchScanRequests();
        expect(currentQueueSize).toBe(initialQueueSize + allPages.length);

        verifyAll();
    });

    it('error while retrieving documents', async () => {
        setupVerifiableQueueSizeCall();

        pageDocumentProviderMock
            .setup(async p => p.getReadyToScanPages(It.isAny()))
            .returns(async () => Promise.resolve(getErrorResponse()))
            .verifiable(Times.once());

        await expect(dispatcher.dispatchScanRequests()).rejects.toThrowError(/Failed request response/);
        pageDocumentProviderMock.verifyAll();
    });

    function getWebPages(count: number): WebsitePage[] {
        const webPages: WebsitePage[] = [];

        for (let i = 0; i < count; i += 1) {
            webPages.push({
                id: `website-${i}`,
            } as WebsitePage);
        }

        return webPages;
    }

    function createWebPagesRequestResponse(webPages: WebsitePage[], continuationToken?: string): CosmosOperationResponse<WebsitePage[]> {
        return {
            type: 'CosmosOperationResponse<WebsitePage>',
            statusCode: 200,
            item: webPages,
            continuationToken: continuationToken,
        } as CosmosOperationResponse<WebsitePage[]>;
    }

    function setupReadyToScanPageForAllPages(dataProviders: QueryDataProviderStub<WebsitePage>[]): void {
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

    function setupVerifiableScanRequestCallForChunk(webPages: WebsitePage[]): void {
        scanRequestSenderMock
            .setup(async s => s.sendRequestToScan(webPages))
            .returns(async () => {
                currentQueueSize += webPages.length;
            })
            .verifiable(Times.once());
    }

    function setupGetReadyToScanPagesCallForChunk(
        webPages: WebsitePage[],
        previousContinuationToken: string,
        continuationToken: string,
    ): void {
        pageDocumentProviderMock
            .setup(async p => p.getReadyToScanPages(previousContinuationToken))
            .returns(async () => Promise.resolve(createWebPagesRequestResponse(webPages, continuationToken)));
    }

    function setupPageDocumentProviderNotCalled(): void {
        pageDocumentProviderMock.setup(async p => p.getReadyToScanPages(It.isAny())).verifiable(Times.never());
    }
    function setupVerifiableQueueSizeCall(): void {
        scanRequestSenderMock
            .setup(async s => s.getCurrentQueueSize())
            .returns(async () => Promise.resolve(currentQueueSize))
            .verifiable(Times.atLeastOnce());
    }

    function setupVerifiableScanRequestNotCalled(): void {
        scanRequestSenderMock.setup(async s => s.sendRequestToScan(It.isAny())).verifiable(Times.never());
    }

    function getErrorResponse(): CosmosOperationResponse<WebsitePage[]> {
        // tslint:disable-next-line: no-object-literal-type-assertion
        return <CosmosOperationResponse<WebsitePage[]>>{
            type: 'CosmosOperationResponse<WebsitePage>',
            statusCode: 500,
            item: <WebsitePage[]>undefined,
        };
    }
});
