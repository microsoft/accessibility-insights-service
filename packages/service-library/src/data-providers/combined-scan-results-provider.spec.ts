// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { BlobContentDownloadResponse, BlobStorageClient } from 'azure-services';
import 'reflect-metadata';
import { CombinedScanResults } from 'storage-documents';
import { IMock, Mock } from 'typemoq';
import { CombinedScanResultsProvider } from './combined-scan-results-provider';
import { DataProvidersCommon } from './data-providers-common';

describe(CombinedScanResultsProvider, () => {
    const fileId = 'file id';
    const filePath = 'file path';
    const combinedResults = {
        urlCount: {
            passed: 1,
            failed: 2,
            total: 3,
        },
        axeResults: {},
    } as CombinedScanResults;
    const resultsString = JSON.stringify(combinedResults);
    const etag = 'etag';

    let blobStorageClientMock: IMock<BlobStorageClient>;
    let dataProvidersCommonMock: IMock<DataProvidersCommon>;

    let testSubject: CombinedScanResultsProvider;

    beforeEach(() => {
        blobStorageClientMock = Mock.ofType<BlobStorageClient>();
        dataProvidersCommonMock = Mock.ofType<DataProvidersCommon>();
        dataProvidersCommonMock.setup(dp => dp.getBlobName(fileId)).returns(() => filePath);

        testSubject = new CombinedScanResultsProvider(blobStorageClientMock.object, dataProvidersCommonMock.object);
    });

    afterEach(() => {
        blobStorageClientMock.verifyAll();
    });

    it('Save combined results', async () => {
        blobStorageClientMock
            .setup(bc => bc.uploadBlobContent(DataProvidersCommon.combinedResultsBlobContainerName, filePath, resultsString, undefined))
            .verifiable();

        const resultFilePath = await testSubject.saveCombinedResults(fileId, combinedResults);

        expect(resultFilePath).toBe(filePath);
    });

    it('Save combined results with etag', async () => {
        const condition = { ifMatchEtag: etag };
        blobStorageClientMock
            .setup(bc => bc.uploadBlobContent(DataProvidersCommon.combinedResultsBlobContainerName, filePath, resultsString, condition))
            .verifiable();

        const resultFilePath = await testSubject.saveCombinedResults(fileId, combinedResults, etag);

        expect(resultFilePath).toBe(filePath);
    });

    it('Read combined results', async () => {
        const response = {
            notFound: false,
            content: stubReadableStream(resultsString),
        } as BlobContentDownloadResponse;
        blobStorageClientMock
            .setup(bc => bc.getBlobContent(DataProvidersCommon.combinedResultsBlobContainerName, filePath))
            .returns(async () => response)
            .verifiable();
        const expectedResults = {
            results: combinedResults,
        };

        const actualResults = await testSubject.readCombinedResults(fileId);

        expect(actualResults).toEqual(expectedResults);
    });

    it('Read combined results handles document not found', async () => {
        const response = {
            notFound: true,
            content: null,
        } as BlobContentDownloadResponse;
        blobStorageClientMock
            .setup(bc => bc.getBlobContent(DataProvidersCommon.combinedResultsBlobContainerName, filePath))
            .returns(async () => response)
            .verifiable();
        const expectedResults = {
            error: {
                errorCode: 'documentNotFound',
            },
        };

        const actualResults = await testSubject.readCombinedResults(fileId);

        expect(actualResults).toEqual(expectedResults);
    });

    it('Read combined results handles unparsable string', async () => {
        const unparsableString = '{ unparsable content string';
        const response = {
            notFound: false,
            content: stubReadableStream(unparsableString),
        } as BlobContentDownloadResponse;
        blobStorageClientMock
            .setup(bc => bc.getBlobContent(DataProvidersCommon.combinedResultsBlobContainerName, filePath))
            .returns(async () => response)
            .verifiable();
        const expectedResults = {
            error: {
                errorCode: 'parseError',
                data: unparsableString,
            },
        };

        const actualResults = await testSubject.readCombinedResults(fileId);

        expect(actualResults).toEqual(expectedResults);
    });
});

function stubReadableStream(content: string): NodeJS.ReadableStream {
    return {
        read: () => content,
    } as unknown as NodeJS.ReadableStream;
}
