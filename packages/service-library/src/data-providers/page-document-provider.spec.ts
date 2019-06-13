// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-import-side-effect no-any no-unsafe-any
import { StorageClient } from 'axis-storage';
import { ItemType, RunResult, RunState, WebsitePage } from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';
import { PageObjectFactory } from '../factories/page-object-factory';
import { PageDocumentProvider } from './page-document-provider';

let pageObjectFactoryMock: IMock<PageObjectFactory>;
let storageClientMock: IMock<StorageClient>;
let pageDocumentProvider: PageDocumentProvider;

beforeEach(() => {
    pageObjectFactoryMock = Mock.ofType<PageObjectFactory>();
    storageClientMock = Mock.ofType<StorageClient>();
    pageDocumentProvider = new PageDocumentProvider(pageObjectFactoryMock.object, storageClientMock.object);
});

describe('PageDocumentProvider', () => {
    it('read ready to scan pages', async () => {
        const items = [
            {
                value: 'value1',
            },
            {
                value: 'value2',
            },
        ];
        const expectedResult = {
            item: items,
            statusCode: 200,
        };
        const continuationToken = 'continuationToken';

        storageClientMock
            .setup(async o => o.queryDocuments(It.isAny(), continuationToken))
            .returns(async () => Promise.resolve({ item: items, statusCode: 200 }))
            .verifiable(Times.once());

        const result = await pageDocumentProvider.getReadyToScanPages(continuationToken);

        expect(result).toEqual(expectedResult);
        storageClientMock.verifyAll();
    });

    it('Set page run state', async () => {
        const websitePage = createWebsitePage();
        websitePage._etag = 'ts12';
        websitePage.lastRun = {
            state: RunState.running,
            runTime: new Date().toJSON(),
        };

        const websitePageToMerge = createWebsitePage();
        websitePageToMerge.lastRun = websitePage.lastRun;

        pageObjectFactoryMock
            .setup(o => o.createImmutableInstance(websitePage.websiteId, websitePage.baseUrl, websitePage.url))
            .returns(() => websitePageToMerge)
            .verifiable(Times.once());
        storageClientMock
            .setup(async o => o.mergeOrWriteDocument(websitePageToMerge))
            .returns(async () => Promise.resolve({ statusCode: 200 }))
            .verifiable(Times.once());

        await pageDocumentProvider.setPageRunState(websitePage);
    });
});

function createWebsitePage(): WebsitePage {
    return {
        id: 'id',
        itemType: ItemType.page,
        websiteId: 'websiteId',
        baseUrl: 'baseUrl',
        url: 'url',
        pageRank: <number>undefined,
        lastReferenceSeen: <string>undefined,
        lastRun: <RunResult>undefined,
        links: undefined,
        partitionKey: 'partitionKey',
    };
}
