// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-import-side-effect no-any no-unsafe-any
import 'reflect-metadata';

import { StorageClient } from 'azure-services';
import { ItemType, RunState, WebsitePage, WebsitePageExtra } from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';
import { PageDocumentProvider } from './page-document-provider';

let storageClientMock: IMock<StorageClient>;
let pageDocumentProvider: PageDocumentProvider;

beforeEach(() => {
    storageClientMock = Mock.ofType<StorageClient>();
    pageDocumentProvider = new PageDocumentProvider(storageClientMock.object);
});

describe('PageDocumentProvider', () => {
    it('Query ready to scan pages', async () => {
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

    it('update page properties', async () => {
        const websitePageBase: WebsitePage = {
            id: 'id',
            itemType: ItemType.page,
            websiteId: 'websiteId',
            baseUrl: 'baseUrl',
            url: 'url',
            partitionKey: 'partitionKey',
            links: ['link1', 'link2'],
        };

        const propertiesToUpdate: WebsitePageExtra = {
            lastRun: {
                runTime: 'runTime',
                state: RunState.completed,
            },
        };

        const websitePageToWrite: WebsitePage = {
            id: 'id',
            itemType: ItemType.page,
            websiteId: 'websiteId',
            baseUrl: 'baseUrl',
            url: 'url',
            partitionKey: 'partitionKey',
            lastRun: {
                runTime: 'runTime',
                state: RunState.completed,
            },
        };

        storageClientMock
            .setup(async o => o.mergeOrWriteDocument(websitePageToWrite))
            .returns(async () => Promise.resolve({ item: websitePageToWrite, statusCode: 200 }))
            .verifiable(Times.once());

        const result = await pageDocumentProvider.updatePageProperties(websitePageBase, propertiesToUpdate);

        expect(result.item).toEqual(websitePageToWrite);
    });
});
