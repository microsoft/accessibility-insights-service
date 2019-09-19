// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { BatchServiceClient } from '@azure/batch';

export const webApiJobManagerIocTypeNames = {
    BatchServiceClientProvider: 'BatchServiceClientProvider',
};

export type BatchServiceClientProvider = () => Promise<BatchServiceClient>;
