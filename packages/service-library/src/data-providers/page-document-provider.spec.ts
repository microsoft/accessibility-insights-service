// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-import-side-effect no-any no-unsafe-any max-func-body-length no-null-keyword
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
        const websites = ['id1', 'id2'];
        const pages1 = [{ name: 'page11' }, { name: 'page12' }];
        const pages2 = [{ name: 'page21' }, { name: 'page22' }];
        const continuationToken = 'continuationToken';

        const expectedResult = {
            item: <any>[],
            statusCode: 200,
            continuationToken: continuationToken,
        };
        expectedResult.item.push(...pages1);
        expectedResult.item.push(...pages2);

        storageClientMock
            .setup(async o => o.queryDocuments(It.isAny(), continuationToken, It.isAny()))
            .returns(async () => Promise.resolve({ item: websites, statusCode: 200 }))
            .verifiable(Times.once());
        storageClientMock
            .setup(async o => o.queryDocuments(It.isAny(), undefined, websites[0]))
            .returns(async () => Promise.resolve({ item: pages1, statusCode: 200 }))
            .verifiable(Times.once());
        storageClientMock
            .setup(async o => o.queryDocuments(It.isAny(), undefined, websites[1]))
            .returns(async () => Promise.resolve({ item: pages2, statusCode: 200 }))
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
