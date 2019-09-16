// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { BlobContentDownloadResponse, BlobStorageClient } from 'azure-services';
import { GuidGenerator } from 'common';
import { IMock, Mock } from 'typemoq';
import { PageScanRunReportService } from './page-scan-run-report-service';

// tslint:disable: no-any

describe(PageScanRunReportService, () => {
    let testSubject: PageScanRunReportService;
    let blobStorageClientMock: IMock<BlobStorageClient>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    const time = new Date(2019, 2, 1, 10, 20, 30);
    const guid = 'some guid';
    // tslint:disable-next-line: mocha-no-side-effect-code
    const expectedSarifBlobFilePath = `${time.getUTCFullYear()}/${time.getUTCMonth() +
        1}/${time.getUTCDate()}/${time.getUTCHours()}/${guid}.sarif`;

    beforeEach(() => {
        blobStorageClientMock = Mock.ofType(BlobStorageClient);
        guidGeneratorMock = Mock.ofType(GuidGenerator);
        testSubject = new PageScanRunReportService(blobStorageClientMock.object, guidGeneratorMock.object);
    });

    it('saves sarif report', async () => {
        const blobContent = 'blob content1';

        guidGeneratorMock
            .setup(g => g.getGuidTimestamp(guid))
            .returns(() => time)
            .verifiable();

        blobStorageClientMock
            .setup(async b => b.uploadBlobContent(PageScanRunReportService.blobContainerName, expectedSarifBlobFilePath, blobContent))
            .returns(async () => Promise.resolve(undefined))
            .verifiable();

        await testSubject.saveSarifReport(guid, blobContent);
        verifyAll();
    });

    it('reads sarif report', async () => {
        const expectedResponse: BlobContentDownloadResponse = { content: 'blob content1' as any, notFound: false };

        guidGeneratorMock
            .setup(g => g.getGuidTimestamp(guid))
            .returns(() => time)
            .verifiable();

        blobStorageClientMock
            .setup(async b => b.getBlobContent(PageScanRunReportService.blobContainerName, expectedSarifBlobFilePath))
            .returns(async () => Promise.resolve(expectedResponse))
            .verifiable();

        await expect(testSubject.readSarifReport(guid)).resolves.toBe(expectedResponse);
        verifyAll();
    });

    function verifyAll(): void {
        guidGeneratorMock.verifyAll();
        blobStorageClientMock.verifyAll();
    }
});
