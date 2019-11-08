import { ContainerSASPermissions, generateBlobSASQueryParameters, SASProtocol, SharedKeyCredential } from '@azure/storage-blob';
import { inject, injectable } from 'inversify';
import * as moment from 'moment';
import { BlobServiceClientProvider, iocTypeNames } from '../ioc-types';
import { secretNames } from '../key-vault/secret-names';
import { SecretProvider } from '../key-vault/secret-provider';

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

@injectable()
export class StorageContainerSASUrlProvider {
    constructor(
        @inject(iocTypeNames.BlobServiceClientProvider) private readonly blobServiceClientProvider: BlobServiceClientProvider,
        @inject(SecretProvider) private readonly secretProvider: SecretProvider,
    ) {}

    public async generateSASUrl(containerName: string): Promise<string> {
        const blobServiceClient = await this.blobServiceClientProvider();
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const accountName = await this.secretProvider.getSecret(secretNames.storageAccountName);
        const accountKey = await this.secretProvider.getSecret(secretNames.storageAccountKey);
        const containerSAS = generateBlobSASQueryParameters(
            {
                expiryTime: moment()
                    .add(1, 'days')
                    .toDate(),
                containerName: containerName,
                permissions: ContainerSASPermissions.parse('w').toString(),
                protocol: SASProtocol.HTTPSandHTTP,
                startTime: moment().toDate(),
            },
            new SharedKeyCredential(accountName, accountKey),
        );

        return `${containerClient.url}?${containerSAS}`;
    }
}
