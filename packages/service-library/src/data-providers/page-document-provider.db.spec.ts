// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-import-side-effect no-any no-unsafe-any max-func-body-length no-null-keyword
import 'reflect-metadata';

import { StorageClient } from 'azure-services';
import { Logger } from 'logger';
import * as moment from 'moment';
import { ItemType, RunResult, RunState, StorageDocument } from 'storage-documents';
import { IMock, Mock } from 'typemoq';
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

describe('Page document provider SQL query', () => {
    it('getPages()', async () => {
        // init helper
        if (!(await dbHelper.init())) {
            console.log('\x1b[31m', 'Warning: The PageDocumentProvider SQL query test has been disabled.');

            return;
        }

        // setup
        const websiteId = dbHelper.createRandomString('websiteId');
        const queryItems: StorageDocument[] = [];
        const nonQueryItems: StorageDocument[] = [];
        const dbItems: StorageDocument[] = [];

        let page;
        // select c.itemType === page only
        nonQueryItems.push(dbHelper.createDocument(ItemType.website));

        // select c.lastReferenceSeen >= today - N days
        page = dbHelper.createPageDocument({
            label: 'before lastReferenceSeen date',
            websiteId: websiteId,
            extra: {
                lastReferenceSeen: moment()
                    .subtract(PageDocumentProvider.pageActiveBeforeDays - 1, 'day')
                    .toJSON(),
            },
        });
        queryItems.push(page);
        page = dbHelper.createPageDocument({
            label: 'past lastReferenceSeen date',
            websiteId: websiteId,
            extra: {
                lastReferenceSeen: moment()
                    .subtract(PageDocumentProvider.pageActiveBeforeDays + 1, 'day')
                    .toJSON(),
            },
        });
        nonQueryItems.push(page);

        //select IS_NULL(c.lastRun) or NOT IS_DEFINED(c.lastRun)
        page = dbHelper.createPageDocument({
            label: 'lastRun is undefined',
            websiteId: websiteId,
            extra: {
                lastReferenceSeen: moment()
                    .subtract(PageDocumentProvider.pageActiveBeforeDays - 1, 'day')
                    .toJSON(),
            },
        });
        queryItems.push(page);
        page = dbHelper.createPageDocument({
            label: 'lastRun is null',
            websiteId: websiteId,
            extra: {
                lastReferenceSeen: moment()
                    .subtract(PageDocumentProvider.pageActiveBeforeDays - 1, 'day')
                    .toJSON(),
                lastRun: <RunResult>null,
            },
        });
        queryItems.push(page);
        page = dbHelper.createPageDocument({
            label: 'lastRun is defined',
            websiteId: websiteId,
            extra: {
                lastReferenceSeen: moment()
                    .subtract(PageDocumentProvider.pageActiveBeforeDays - 1, 'day')
                    .toJSON(),
                lastRun: {
                    runTime: new Date().toJSON(),
                    state: RunState.completed,
                },
            },
        });
        nonQueryItems.push(page);

        // select c.lastRun.state = @completedState and c.lastRun.runTime <= @pageRescanAfterTime
        page = dbHelper.createPageDocument({
            label: 'completed state after lastRun.runTime',
            websiteId: websiteId,
            extra: {
                lastReferenceSeen: moment()
                    .subtract(PageDocumentProvider.pageActiveBeforeDays - 1, 'day')
                    .toJSON(),
                lastRun: {
                    runTime: moment()
                        .subtract(PageDocumentProvider.pageRescanAfterDays + 1, 'day')
                        .toJSON(),
                    state: RunState.completed,
                },
            },
        });
        queryItems.push(page);
        page = dbHelper.createPageDocument({
            label: 'completed state before lastRun.runTime',
            websiteId: websiteId,
            extra: {
                lastReferenceSeen: moment()
                    .subtract(PageDocumentProvider.pageActiveBeforeDays - 1, 'day')
                    .toJSON(),
                lastRun: {
                    runTime: moment()
                        .subtract(PageDocumentProvider.pageRescanAfterDays - 1, 'day')
                        .toJSON(),
                    state: RunState.completed,
                },
            },
        });
        nonQueryItems.push(page);

        // select ((c.lastRun.state = @failedState or c.lastRun.state = @queuedState or c.lastRun.state = @runningState)
        // and (c.lastRun.retries < @maxRetryCount or IS_NULL(c.lastRun.retries) or NOT IS_DEFINED(c.lastRun.retries))
        // and c.lastRun.runTime <= @rescanAbandonedRunAfterTime)
        page = dbHelper.createPageDocument({
            label: 'failed state after lastRun.runTime (retries === undefined)',
            websiteId: websiteId,
            extra: {
                lastReferenceSeen: moment()
                    .subtract(PageDocumentProvider.pageActiveBeforeDays - 1, 'day')
                    .toJSON(),
                lastRun: {
                    runTime: moment()
                        .subtract(PageDocumentProvider.rescanAbandonedRunAfterHours + 1, 'hour')
                        .toJSON(),
                    state: RunState.failed,
                },
            },
        });
        queryItems.push(page);
        page = dbHelper.createPageDocument({
            label: 'failed state before lastRun.runTime (retries === undefined)',
            websiteId: websiteId,
            extra: {
                lastReferenceSeen: moment()
                    .subtract(PageDocumentProvider.pageActiveBeforeDays - 1, 'day')
                    .toJSON(),
                lastRun: {
                    runTime: moment()
                        .subtract(PageDocumentProvider.rescanAbandonedRunAfterHours - 1, 'hour')
                        .toJSON(),
                    state: RunState.failed,
                },
            },
        });
        nonQueryItems.push(page);
        page = dbHelper.createPageDocument({
            label: 'failed state after lastRun.runTime (retries === null)',
            websiteId: websiteId,
            extra: {
                lastReferenceSeen: moment()
                    .subtract(PageDocumentProvider.pageActiveBeforeDays - 1, 'day')
                    .toJSON(),
                lastRun: {
                    runTime: moment()
                        .subtract(PageDocumentProvider.rescanAbandonedRunAfterHours + 1, 'hour')
                        .toJSON(),
                    state: RunState.failed,
                    retries: null,
                },
            },
        });
        queryItems.push(page);
        page = dbHelper.createPageDocument({
            label: 'failed state after lastRun.runTime (retries < threshold)',
            websiteId: websiteId,
            extra: {
                lastReferenceSeen: moment()
                    .subtract(PageDocumentProvider.pageActiveBeforeDays - 1, 'day')
                    .toJSON(),
                lastRun: {
                    runTime: moment()
                        .subtract(PageDocumentProvider.rescanAbandonedRunAfterHours + 1, 'hour')
                        .toJSON(),
                    state: RunState.failed,
                    retries: 1,
                },
            },
        });
        queryItems.push(page);
        page = dbHelper.createPageDocument({
            label: 'failed state after lastRun.runTime (retries > threshold)',
            websiteId: websiteId,
            extra: {
                lastReferenceSeen: moment()
                    .subtract(PageDocumentProvider.pageActiveBeforeDays - 1, 'day')
                    .toJSON(),
                lastRun: {
                    runTime: moment()
                        .subtract(PageDocumentProvider.rescanAbandonedRunAfterHours + 1, 'hour')
                        .toJSON(),
                    state: RunState.failed,
                    retries: PageDocumentProvider.maxRetryCount,
                },
            },
        });
        nonQueryItems.push(page);
        page = dbHelper.createPageDocument({
            label: 'queued state after lastRun.runTime (retries === undefined)',
            websiteId: websiteId,
            extra: {
                lastReferenceSeen: moment()
                    .subtract(PageDocumentProvider.pageActiveBeforeDays - 1, 'day')
                    .toJSON(),
                lastRun: {
                    runTime: moment()
                        .subtract(PageDocumentProvider.rescanAbandonedRunAfterHours + 1, 'hour')
                        .toJSON(),
                    state: RunState.queued,
                },
            },
        });
        queryItems.push(page);
        page = dbHelper.createPageDocument({
            label: 'running state after lastRun.runTime (retries === undefined)',
            websiteId: websiteId,
            extra: {
                lastReferenceSeen: moment()
                    .subtract(PageDocumentProvider.pageActiveBeforeDays - 1, 'day')
                    .toJSON(),
                lastRun: {
                    runTime: moment()
                        .subtract(PageDocumentProvider.rescanAbandonedRunAfterHours + 1, 'hour')
                        .toJSON(),
                    state: RunState.running,
                },
            },
        });
        queryItems.push(page);

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

        const result: StorageDocument[] = [];
        let continuationToken: string;
        do {
            const response = await pageDocumentProvider.getPages(websiteId, continuationToken, 100);
            if (response !== undefined && response.item !== undefined) {
                result.push(...response.item);
            }
            continuationToken = response.continuationToken;
        } while (continuationToken !== undefined);

        // validate
        const resultItemsProjection = result.map(i => dbHelper.getDocumentProjection(i));
        const queryItemsProjection = queryItems.map(i => dbHelper.getDocumentProjection(i));
        const nonQueryItemsProjection = nonQueryItems.map(i => dbHelper.getDocumentProjection(i));

        queryItemsProjection.map(i => {
            const item = resultItemsProjection.filter(r => r.id === i.id);
            expect(item[0]).toEqual(i);
        });
        nonQueryItemsProjection.map(i => {
            const item = resultItemsProjection.filter(r => r.id === i.id);
            expect(item[0]).toBeUndefined();
        });
    }, 30000);
});
