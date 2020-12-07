// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { BlobContentDownloadResponse, BlobStorageClient } from 'azure-services';
import { IMock, Mock } from 'typemoq';
import { PageScanRunReportProvider } from './page-scan-run-report-provider';
import { DataProvidersCommon } from './data-providers-common';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe(PageScanRunReportProvider, () => {
    let testSubject: PageScanRunReportProvider;
    let blobStorageClientMock: IMock<BlobStorageClient>;
    let dataProvidersCommonMock: IMock<DataProvidersCommon>;

    const time = new Date(2019, 2, 1, 10, 20, 30);
    const guid = 'some guid';
    const expectedSarifBlobFilePath = `${time.getUTCFullYear()}/${
        time.getUTCMonth() + 1
    }/${time.getUTCDate()}/${time.getUTCHours()}/${guid}`;

    beforeEach(() => {
        blobStorageClientMock = Mock.ofType(BlobStorageClient);
        dataProvidersCommonMock = Mock.ofType(DataProvidersCommon);
        dataProvidersCommonMock
            .setup((o) => o.getBlobName(guid))
            .returns(() => expectedSarifBlobFilePath)
            .verifiable();

        testSubject = new PageScanRunReportProvider(blobStorageClientMock.object, dataProvidersCommonMock.object);
    });

    afterEach(() => {
        dataProvidersCommonMock.verifyAll();
        blobStorageClientMock.verifyAll();
    });

    it('save report', async () => {
        const blobContent = 'blob content1';

        blobStorageClientMock
            .setup(async (b) => b.uploadBlobContent(DataProvidersCommon.reportBlobContainerName, expectedSarifBlobFilePath, blobContent))
            .returns(async () => Promise.resolve(undefined))
            .verifiable();

        expect(await testSubject.saveReport(guid, blobContent)).toEqual(expectedSarifBlobFilePath);
    });

    it('read report', async () => {
        const expectedResponse: BlobContentDownloadResponse = { content: 'blob content1' as any, notFound: false };

        blobStorageClientMock
            .setup(async (b) => b.getBlobContent(DataProvidersCommon.reportBlobContainerName, expectedSarifBlobFilePath))
            .returns(async () => Promise.resolve(expectedResponse))
            .verifiable();

        await expect(testSubject.readReport(guid)).resolves.toBe(expectedResponse);
    });
});
