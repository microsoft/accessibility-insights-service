// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-import-side-effect no-any
import 'reflect-metadata';

import { Queue, StorageConfig } from 'azure-services';
import { PageDocumentProvider } from 'service-library';
import { ItemType, RunState, WebsitePage } from 'storage-documents';
import { IMock, Mock, Times } from 'typemoq';
import { ScanRequestSender } from './request-sender';
// tslint:disable: no-unsafe-any
describe('Scan request Sender', () => {
    let queueMock: IMock<Queue>;
    let testSubject: ScanRequestSender;
    let storageConfigStub: StorageConfig;
    let pageDocumentProviderMock: IMock<PageDocumentProvider>;
    beforeEach(() => {
        storageConfigStub = {
            scanQueue: 'test-scan-queue',
        };

        queueMock = Mock.ofType<Queue>();
        pageDocumentProviderMock = Mock.ofType<PageDocumentProvider>();
        testSubject = new ScanRequestSender(pageDocumentProviderMock.object, queueMock.object, storageConfigStub);
    });
    it('send scan request', async () => {
        const websitesData = getWebSitesData();
        //tslint:disable-next-line: no-floating-promises
        websitesData.forEach(website => {
            queueMock
                .setup(async q => q.createMessage(storageConfigStub.scanQueue, website))
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());

            pageDocumentProviderMock
                .setup(async o => o.updateRunState(website))
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());
        });

        await testSubject.sendRequestToScan(websitesData);
        queueMock.verifyAll();
    });

    function getWebSitesData(): WebsitePage[] {
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
                    state: RunState.completed,
                    error: '',
                    retries: 1,
                },
                links: ['https://www.microsoft.com/1', 'https://www.microsoft.com/2'],
            },
        ] as WebsitePage[];
    }
});
