// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-import-side-effect no-any no-unsafe-any
import 'reflect-metadata';

import { StorageClient } from 'azure-services';
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
});
