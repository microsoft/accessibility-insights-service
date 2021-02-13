// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { GuidGenerator } from 'common';
import { CombinedScanResultsProvider, CombinedScanResultsReadResponse } from 'service-library';
import { IMock, Mock } from 'typemoq';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { CombinedResultsBlob } from '../types/combined-results-blob';
import { CombinedResultsBlobProvider } from './combined-results-blob-provider';

describe(CombinedResultsBlobProvider, () => {
    let combinedScanResultsProviderMock: IMock<CombinedScanResultsProvider>;
    let loggerMock: IMock<MockableLogger>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let testSubject: CombinedResultsBlobProvider;

    let givenResultsBlobIdStub: string;
    let emptyReadResponseStub: CombinedScanResultsReadResponse;
    let readResponseStub: CombinedScanResultsReadResponse;

    beforeEach(() => {
        loggerMock = Mock.ofType(MockableLogger);
        combinedScanResultsProviderMock = Mock.ofType<CombinedScanResultsProvider>();
        guidGeneratorMock = Mock.ofType(GuidGenerator);

        givenResultsBlobIdStub = 'some-blob-id';
        emptyReadResponseStub = {
            etag: 'empty-response-etag',
        };
        readResponseStub = {
            etag: 'some-response-etag',
        };

        testSubject = new CombinedResultsBlobProvider(combinedScanResultsProviderMock.object, guidGeneratorMock.object, loggerMock.object);
    });

    test('givenResultsBlobId is undefined', async () => {
        givenResultsBlobIdStub = undefined;
        const generatedGuidStub = 'some-generated-guid';
        const expectedBlobInfo: CombinedResultsBlob = {
            blobId: generatedGuidStub,
            response: emptyReadResponseStub,
        };

        guidGeneratorMock.setup((mock) => mock.createGuid()).returns(() => generatedGuidStub);
        combinedScanResultsProviderMock.setup((mock) => mock.getEmptyResponse()).returns(() => emptyReadResponseStub);

        expect(await testSubject.getBlob(givenResultsBlobIdStub)).toEqual(expectedBlobInfo);
    });

    test('readResponse has blobNotFound error code', async () => {
        const expectedBlobInfo: CombinedResultsBlob = {
            blobId: givenResultsBlobIdStub,
            response: emptyReadResponseStub,
        };

        const readResponseWithBlobNotFound: CombinedScanResultsReadResponse = {
            error: {
                errorCode: 'blobNotFound',
            },
        };

        setupBlobRead(givenResultsBlobIdStub, readResponseWithBlobNotFound);
        combinedScanResultsProviderMock.setup((mock) => mock.getEmptyResponse()).returns(() => emptyReadResponseStub);

        expect(await testSubject.getBlob(givenResultsBlobIdStub)).toEqual(expectedBlobInfo);
    });

    test('Successfully retrieves the combined results', async () => {
        const expectedBlobInfo: CombinedResultsBlob = {
            blobId: givenResultsBlobIdStub,
            response: readResponseStub,
        };

        setupBlobRead(givenResultsBlobIdStub, readResponseStub);

        expect(await testSubject.getBlob(givenResultsBlobIdStub)).toEqual(expectedBlobInfo);
    });

    test('readResponse has jsonParseError error code', async () => {
        const readResponseWithError: CombinedScanResultsReadResponse = {
            error: {
                errorCode: 'jsonParseError',
            },
        };

        setupBlobRead(givenResultsBlobIdStub, readResponseWithError);

        await expect(testSubject.getBlob(givenResultsBlobIdStub)).rejects.toThrowError('Failed to read combined axe results blob.');
    });

    function setupBlobRead(expectedCombinedResultsBlobId: string, response: CombinedScanResultsReadResponse): void {
        combinedScanResultsProviderMock
            .setup((m) => m.readCombinedResults(expectedCombinedResultsBlobId))
            .returns(() => Promise.resolve(response));
    }
});
