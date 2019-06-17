// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-import-side-effect no-any no-unsafe-any
import 'reflect-metadata';

import { CosmosOperationResponse } from 'azure-services';
import { Logger } from 'logger';
import { PageDocumentProvider } from 'service-library';
import { ItemType, RunState, WebsitePage } from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';
import { Dispatcher } from './dispatcher';
import { ScanRequestSender } from './scan-request-sender';

let loggerMock: IMock<Logger>;
let pageDocumentProviderMock: IMock<PageDocumentProvider>;
let scanRequestSenderMock: IMock<ScanRequestSender>;
let dispatcher: Dispatcher;

describe('Dispatcher', () => {
    beforeEach(() => {
        process.env.QUEUE_SIZE = '10';
        loggerMock = Mock.ofType(Logger);
        pageDocumentProviderMock = Mock.ofType(PageDocumentProvider);
        scanRequestSenderMock = Mock.ofType(ScanRequestSender);
        dispatcher = new Dispatcher(pageDocumentProviderMock.object, loggerMock.object, scanRequestSenderMock.object);
    });

    it('dispatch scan requests, when current queue size greater than config queue size', async () => {
        setupQueueSize(15);
        loggerMock.setup(o => o.logWarn(It.isAny())).verifiable(Times.once());
        await dispatcher.dispatchScanRequests();
    });

    it('error while retrieving documents', async () => {
        setupQueueSize(8);
        setupPageDocumentProviderMock(getErrorResponse());

        await expect(dispatcher.dispatchScanRequests()).rejects.toThrowError(/Server response:/);
    });

    it('dispatch scan requests, when current queue size less than config queue size', async () => {
        setupQueueSize(8);
        setupSenderMock();
        setupPageDocumentProviderMock(getReadyToScanPagesData());

        await dispatcher.dispatchScanRequests();
        pageDocumentProviderMock.verifyAll();
    });

    function setupPageDocumentProviderMock(response: CosmosOperationResponse<WebsitePage[]>): void {
        pageDocumentProviderMock
            .setup(async p => p.getReadyToScanPages(It.isAny()))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());
    }

    function setupQueueSize(size: number): void {
        scanRequestSenderMock.setup(async s => s.getCurrentQueueSize()).returns(async () => Promise.resolve(size));
    }

    function setupSenderMock(): void {
        // tslint:disable-next-line: no-void-expression
        scanRequestSenderMock.setup(async s => s.sendRequestToScan(It.isAny())).returns(async () => Promise.resolve(setupQueueSize(10)));
    }

    function getErrorResponse(): CosmosOperationResponse<WebsitePage[]> {
        // tslint:disable-next-line: no-object-literal-type-assertion
        return <CosmosOperationResponse<WebsitePage[]>>{
            type: 'CosmosOperationResponse<WebsitePage>',
            statusCode: 500,
            item: <WebsitePage[]>undefined,
        };
    }

    function getReadyToScanPagesData(): CosmosOperationResponse<WebsitePage[]> {
        // tslint:disable-next-line: no-object-literal-type-assertion
        return <CosmosOperationResponse<WebsitePage[]>>{
            type: 'CosmosOperationResponse<WebsitePage>',
            statusCode: 200,
            item: <WebsitePage[]>[
                {
                    id: '1',
                    itemType: ItemType.page,
                    partitionKey: 'https://www.microsoft.com',
                    websiteId: '1234',
                    baseUrl: 'https://www.microsoft.com',
                    url: 'https://www.microsoft.com',
                    basePage: true,
                    pageRank: 1,
                    lastReferenceSeen: 'abc',
                    lastRun: {
                        runTime: 'test',
                        state: RunState.completed,
                        error: '',
                        retries: 1,
                    },
                    links: ['https://www.microsoft.com/1', 'https://www.microsoft.com/2'],
                },
                {
                    id: '2',
                    itemType: ItemType.page,
                    partitionKey: 'https://www.xbox.com',
                    websiteId: '1234',
                    baseUrl: 'https://www.xbox.com',
                    url: 'https://www.xbox.com',
                    basePage: true,
                    pageRank: 1,
                    lastReferenceSeen: 'abc',
                    lastRun: {
                        runTime: 'test',
                        state: RunState.completed,
                        error: '',
                        retries: 1,
                    },
                    links: ['https://www.xbox.com/1', 'https://www.xbox.com/2'],
                },
            ],
        };
    }
});
