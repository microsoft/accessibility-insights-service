// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-import-side-effect no-any no-unsafe-any
import 'reflect-metadata';

import { StorageClient } from 'azure-services';
import { Logger } from 'logger';
import * as moment from 'moment';
import { ItemType, RunState, StorageDocument, WebsitePage, WebsitePageExtra } from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';
import * as dbHelper from '../test-utilities/db-mock-helpers';
import { PageDocumentProvider } from './page-document-provider';

let storageClientMock: IMock<StorageClient>;
let loggerMock: IMock<Logger>;
let pageDocumentProvider: PageDocumentProvider;

beforeEach(() => {
    storageClientMock = Mock.ofType<StorageClient>();
    loggerMock = Mock.ofType<Logger>();
    pageDocumentProvider = new PageDocumentProvider(storageClientMock.object);
});

describe('SQL query', () => {
    it('', async () => {
        const queryItems: StorageDocument[] = [];
        const nonQueryItems: StorageDocument[] = [];
        const dbItems: StorageDocument[] = [];

        let page;
        // select c.itemType = page only
        nonQueryItems.push(dbHelper.createDocument(ItemType.website));

        // select c.lastReferenceSeen >= today - N days
        const nDays = 7;
        page = dbHelper.createPageDocument({
            lastReferenceSeen: moment()
                .subtract(nDays - 1, 'day')
                .toJSON(),
        });
        queryItems.push(page);
        page = dbHelper.createPageDocument({
            lastReferenceSeen: moment()
                .subtract(nDays + 1, 'day')
                .toJSON(),
        });
        nonQueryItems.push(page);

        // create test db
        await dbHelper.init('db-f1bc8ebda1', 'col-bbe6a9c52f');
        dbItems.push(...queryItems);
        dbItems.push(...nonQueryItems);
        await dbHelper.upsertItems(dbItems);

        // invoke
        const storageClient = new StorageClient(
            dbHelper.cosmosClient,
            dbHelper.dbContainer.dbName,
            dbHelper.dbContainer.collectionName,
            loggerMock.object,
        );
        pageDocumentProvider = new PageDocumentProvider(storageClient);
        const result = await pageDocumentProvider.getReadyToScanPages();

        // validate
        expect(result).toEqual('');
    });
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
