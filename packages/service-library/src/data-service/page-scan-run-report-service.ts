// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { BlobContentDownloadResponse, BlobStorageClient } from 'azure-services';
import { GuidGenerator } from 'common';
import { inject, injectable } from 'inversify';

@injectable()
export class PageScanRunReportService {
    public static readonly blobContainerName = 'page-scan-run-reports';
    private static readonly sarifFileExtension = '.sarif';

    constructor(
        @inject(BlobStorageClient) private readonly blobStorageClient: BlobStorageClient,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
    ) {}

    public async saveSarifReport(fileId: string, content: string): Promise<void> {
        await this.blobStorageClient.uploadBlobContent(
            PageScanRunReportService.blobContainerName,
            this.getBlobFilePath(fileId, PageScanRunReportService.sarifFileExtension),
            content,
        );
    }

    public async readSarifReport(fileId: string): Promise<BlobContentDownloadResponse> {
        return this.blobStorageClient.getBlobContent(
            PageScanRunReportService.blobContainerName,
            this.getBlobFilePath(fileId, PageScanRunReportService.sarifFileExtension),
        );
    }

    private getBlobFilePath(fileId: string, extension: string): string {
        const fileCreatedTime = this.guidGenerator.getGuidTimestamp(fileId);

        return `${fileCreatedTime.getFullYear()}/${fileCreatedTime.getMonth() +
            1}/${fileCreatedTime.getDate()}/${fileCreatedTime.getHours()}/${fileId}${extension}`;
    }
}
