// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { BlobContentDownloadResponse, BlobStorageClient } from 'azure-services';
import { inject, injectable } from 'inversify';
import { DataProvidersCommon } from './data-providers-common';

@injectable()
export class PageScanRunReportProvider {
    constructor(
        @inject(BlobStorageClient) private readonly blobStorageClient: BlobStorageClient,
        @inject(DataProvidersCommon) private readonly dataProvidersCommon: DataProvidersCommon,
    ) {}

    public async saveReport(fileId: string, content: string): Promise<string> {
        const filePath = this.dataProvidersCommon.getBlobName(fileId);
        await this.blobStorageClient.uploadBlobContent(DataProvidersCommon.reportBlobContainerName, filePath, content);

        return filePath;
    }

    public async readReport(fileId: string): Promise<BlobContentDownloadResponse> {
        const downloadResponse = await this.blobStorageClient.getBlobContent(
            DataProvidersCommon.reportBlobContainerName,
            this.dataProvidersCommon.getBlobName(fileId),
        );

        return downloadResponse;
    }
}
