// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { BlobContentDownloadResponse, BlobStorageClient } from 'azure-services';
import { GuidGenerator } from 'common';
import { inject, injectable } from 'inversify';
import { ReportFormat } from 'storage-documents';

@injectable()
export class PageScanRunReportService {
    public static readonly blobContainerName = 'page-scan-run-reports';

    constructor(
        @inject(BlobStorageClient) private readonly blobStorageClient: BlobStorageClient,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
    ) {}

    public async saveReport(fileId: string, content: string): Promise<string> {
        const filePath = this.getBlobFilePath(fileId);
        await this.blobStorageClient.uploadBlobContent(PageScanRunReportService.blobContainerName, filePath, content);

        return filePath;
    }

    public async readReport(fileId: string): Promise<BlobContentDownloadResponse> {
        return this.blobStorageClient.getBlobContent(PageScanRunReportService.blobContainerName, this.getBlobFilePath(fileId));
    }

    public getBlobFilePath(fileId: string): string {
        const fileCreatedTime = this.guidGenerator.getGuidTimestamp(fileId);

        return `${fileCreatedTime.getUTCFullYear()}/${fileCreatedTime.getUTCMonth() +
            1}/${fileCreatedTime.getUTCDate()}/${fileCreatedTime.getUTCHours()}/${fileId}`;
    }
}
