// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { StorageDocument } from './storage-document';

export interface ScanQueueLoadSnapshot extends StorageDocument {
    storageAccountName: string;
    queueName: string;
    queueSizePerInterval: number;
    queueBufferingIndex: number;
    samplingIntervalInSeconds: number;
    timestamp: Date;
}
