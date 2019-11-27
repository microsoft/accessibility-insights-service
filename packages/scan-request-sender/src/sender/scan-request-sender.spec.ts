// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-import-side-effect no-any no-unsafe-any
import 'reflect-metadata';

import { Queue, StorageConfig } from 'azure-services';
import { Logger } from 'logger';
import { PageDocumentProvider } from 'service-library';
import { ItemType, RunState, ScanRequestMessage, WebsitePage, WebsitePageExtra } from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';
import { ScanRequestSender } from './scan-request-sender';

describe('Scan request Sender', () => {
    let queueMock: IMock<Queue>;
    let testSubject: ScanRequestSender;
    let storageConfigStub: StorageConfig;
    let pageDocumentProviderMock: IMock<PageDocumentProvider>;
    let loggerMock: IMock<Logger>;

    beforeEach(() => {
        storageConfigStub = {
            scanQueue: 'test-scan-queue',
        };

        loggerMock = Mock.ofType(Logger);
        queueMock = Mock.ofType<Queue>();
        pageDocumentProviderMock = Mock.ofType<PageDocumentProvider>();
        testSubject = new ScanRequestSender(pageDocumentProviderMock.object, queueMock.object, storageConfigStub, loggerMock.object);
    });

    afterEach(() => {
        queueMock.verifyAll();
        pageDocumentProviderMock.verifyAll();
    });

    it('send scan request', async () => {
        const websitePages = getWebsitePages(RunState.completed);
        let websitePageUpdateDelta: WebsitePageExtra;

        websitePages.forEach(page => {
            const message: ScanRequestMessage = getScanRequestMessage(page);
            queueMock
                .setup(async q => q.createMessage(storageConfigStub.scanQueue, message))
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());

            pageDocumentProviderMock
                .setup(async o => o.updatePageProperties(page, It.isAny(), loggerMock.object))
                .callback((p, d) => {
                    websitePageUpdateDelta = d;
                })
                .returns(async () => Promise.resolve({ statusCode: 200, item: page }))
                .verifiable(Times.once());
        });

        await testSubject.sendRequestToScan(websitePages);

        expect(websitePageUpdateDelta.lastRun.state).toEqual(RunState.queued);
        expect(websitePageUpdateDelta.lastRun.retries).toBeUndefined();
    });

    it('update retry count', async () => {
        const websitePages = getWebsitePages(RunState.failed);
        let websitePageUpdateDelta: WebsitePageExtra;

        websitePages.forEach(page => {
            const message: ScanRequestMessage = getScanRequestMessage(page);
            queueMock
                .setup(async q => q.createMessage(storageConfigStub.scanQueue, message))
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());

            pageDocumentProviderMock
                .setup(async o => o.updatePageProperties(page, It.isAny(), loggerMock.object))
                .callback((p, d) => {
                    websitePageUpdateDelta = d;
                })
                .returns(async () => Promise.resolve({ statusCode: 200, item: page }))
                .verifiable(Times.once());
        });

        await testSubject.sendRequestToScan(websitePages);

        expect(websitePageUpdateDelta.lastRun.state).toEqual(RunState.queued);
        expect(websitePageUpdateDelta.lastRun.retries).toEqual(2);
    });

    function getWebsitePages(runState: RunState): WebsitePage[] {
        return [
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
                    state: runState,
                    error: '',
                    retries: 1,
                },
                links: ['https://www.microsoft.com/1', 'https://www.microsoft.com/2'],
            },
        ] as WebsitePage[];
    }

    function getScanRequestMessage(page: WebsitePage): ScanRequestMessage {
        return {
            url: page.url,
            baseUrl: page.baseUrl,
            websiteId: page.websiteId,
        };
    }
});
