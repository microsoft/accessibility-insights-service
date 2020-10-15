// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable, inject } from 'inversify';
import { BlobStorageClient, BlobContentDownloadResponse } from 'azure-services';
import { DataProvidersCommon } from './data-providers-common';

@injectable()
export class ConsolidatedReportProvider {
    constructor(
        @inject(BlobStorageClient) private readonly blobStorageClient: BlobStorageClient,
        @inject(DataProvidersCommon) private readonly dataProvidersCommon: DataProvidersCommon,
    ) {}

    public async mergeOrCreate(fileId: string, content: string): Promise<string> {
        // const blobName = this.dataProvidersCommon.getReportBlobName(fileId);

        return '';
    }

    public async mergeOrCreateImpl(blobName: string, content: string): Promise<boolean> {
        const response = await this.blobStorageClient.getBlobContent(DataProvidersCommon.reportBlobContainerName, blobName);
        if (response.notFound === true) {
            return this.create(blobName, content);
        }

        return false;
    }

    public async read(fileId: string): Promise<BlobContentDownloadResponse> {
        const downloadResponse = await this.blobStorageClient.getBlobContent(
            DataProvidersCommon.reportBlobContainerName,
            this.dataProvidersCommon.getReportBlobName(fileId),
        );

        return downloadResponse;
    }

    public async create(blobName: string, content: string): Promise<boolean> {
        // create blob if none exists
        const response = await this.blobStorageClient.uploadBlobContent(DataProvidersCommon.reportBlobContainerName, blobName, content, {
            ifNoneMatchEtag: '*',
        });

        return response?.errorCode === undefined;
    }
}
