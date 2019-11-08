// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { BlobClient, BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import 'reflect-metadata';
import { IMock, Mock, Times } from 'typemoq';
import { secretNames } from '../key-vault/secret-names';
import { SecretProvider } from '../key-vault/secret-provider';
import { StorageContainerSASUrlProvider } from './container-sas-url-provider';

describe(StorageContainerSASUrlProvider, () => {
    let blobServiceClientMock: IMock<BlobServiceClient>;
    let blobClientMock: IMock<BlobClient>;
    let containerClientMock: IMock<ContainerClient>;
    let secretProviderMock: IMock<SecretProvider>;
    let testSubject: StorageContainerSASUrlProvider;
    const containerName = 'test-container';
    const blobName = 'blob name1';
    const storageAccountName = 'test-storage-account-name';
    const storageAccountKey = 'test-storage-account-key';
    const containerUrl = 'https://testcontainer.blob.core.windiows.net/batch-logs/';
    beforeEach(() => {
        blobServiceClientMock = Mock.ofType(BlobServiceClient);
        blobClientMock = Mock.ofType(BlobClient);
        containerClientMock = Mock.ofType(ContainerClient);
        secretProviderMock = Mock.ofType(SecretProvider);
        blobServiceClientMock.setup(b => b.getContainerClient(containerName)).returns(() => containerClientMock.object);
        containerClientMock.setup(c => c.getBlobClient(blobName)).returns(() => blobClientMock.object);
        containerClientMock.setup(c => c.url).returns(() => containerUrl);
        secretProviderMock
            .setup(async s => s.getSecret(secretNames.storageAccountName))
            .returns(async () => storageAccountName)
            .verifiable(Times.once());
        secretProviderMock
            .setup(async s => s.getSecret(secretNames.storageAccountKey))
            .returns(async () => storageAccountKey)
            .verifiable(Times.once());

        testSubject = new StorageContainerSASUrlProvider(async () => blobServiceClientMock.object, secretProviderMock.object);
    });
    it('successfully generated sas url', async () => {
        const sasUrl = await testSubject.generateSASUrl(containerName);
        expect(sasUrl).toBeDefined();
        expect(sasUrl).toContain(containerUrl);
    });
});
