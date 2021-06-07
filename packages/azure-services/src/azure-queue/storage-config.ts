// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';

@injectable()
export class StorageConfig {
    public readonly scanQueue: string = process.env.AZURE_STORAGE_SCAN_QUEUE;

    public readonly notificationQueue: string = process.env.AZURE_STORAGE_NOTIFICATION_QUEUE;
}
