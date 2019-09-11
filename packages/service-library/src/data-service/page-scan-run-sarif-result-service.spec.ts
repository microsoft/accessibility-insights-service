// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { BlobContentDownloadResponse, BlobStorageClient } from 'azure-services';
import { GuidGenerator } from 'common';
import { IMock, Mock } from 'typemoq';
import { PageScanRunSarifResultService } from './page-scan-run-sarif-result-service';

// tslint:disable: no-any

describe(PageScanRunSarifResultService, () => {
    let testSubject: PageScanRunSarifResultService;
    let blobStorageClientMock: IMock<BlobStorageClient>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    const time = new Date(2019, 2, 1, 10, 20, 30);
    const guid = 'some guid';
    // tslint:disable-next-line: mocha-no-side-effect-code
    const expectedBlobFilePath = `2019/3/1/10/${guid}.sarif`;

    beforeEach(() => {
        blobStorageClientMock = Mock.ofType(BlobStorageClient);
        guidGeneratorMock = Mock.ofType(GuidGenerator);
        testSubject = new PageScanRunSarifResultService(blobStorageClientMock.object, guidGeneratorMock.object);
    });

    it('saves result file', async () => {
        const blobContent = 'blob content1';

        guidGeneratorMock
            .setup(g => g.getGuidTimestamp(guid))
            .returns(() => time)
            .verifiable();

        blobStorageClientMock
            .setup(async b => b.uploadBlobContent(PageScanRunSarifResultService.blobContainerName, expectedBlobFilePath, blobContent))
            .returns(async () => Promise.resolve(undefined))
            .verifiable();

        await testSubject.saveResultFile(guid, blobContent);
        verifyAll();
    });

    it('read result file', async () => {
        const expectedResponse: BlobContentDownloadResponse = { content: 'blob content1' as any, notFound: false };

        guidGeneratorMock
            .setup(g => g.getGuidTimestamp(guid))
            .returns(() => time)
            .verifiable();

        blobStorageClientMock
            .setup(async b => b.getBlobContent(PageScanRunSarifResultService.blobContainerName, expectedBlobFilePath))
            .returns(async () => Promise.resolve(expectedResponse))
            .verifiable();

        await expect(testSubject.readResultFile(guid)).resolves.toBe(expectedResponse);
        verifyAll();
    });

    function verifyAll(): void {
        guidGeneratorMock.verifyAll();
        blobStorageClientMock.verifyAll();
    }
});
