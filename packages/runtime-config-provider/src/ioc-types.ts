// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { BlobServiceClient } from '@azure/storage-blob';

export const runtimeConfigIocTypes = {
    BlobServiceClientFactory: 'BlobServiceClientFactory',
};

export type BlobServiceClientFactory = () => BlobServiceClient;
