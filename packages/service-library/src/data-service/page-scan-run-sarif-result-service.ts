// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { BlobContentDownloadResponse, BlobStorageClient } from 'azure-services';
import { GuidGenerator } from 'common';
import { inject, injectable } from 'inversify';

@injectable()
export class PageScanRunSarifResultService {
    public static readonly blobContainerName = 'page-scan-run-sarif-results';

    constructor(
        @inject(BlobStorageClient) private readonly blobStorageClient: BlobStorageClient,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
    ) {}

    public async saveResultFile(fileId: string, content: string): Promise<void> {
        await this.blobStorageClient.uploadBlobContent(
            PageScanRunSarifResultService.blobContainerName,
            this.getBlobFilePath(fileId),
            content,
        );
    }

    public async readResultFile(fileId: string): Promise<BlobContentDownloadResponse> {
        return this.blobStorageClient.getBlobContent(PageScanRunSarifResultService.blobContainerName, this.getBlobFilePath(fileId));
    }

    private getBlobFilePath(fileId: string): string {
        const fileCreatedTime = this.guidGenerator.getGuidTimestamp(fileId);

        return `${fileCreatedTime.getFullYear()}/${fileCreatedTime.getMonth() +
            1}/${fileCreatedTime.getDate()}/${fileCreatedTime.getHours()}/${fileId}.sarif`;
    }
}
