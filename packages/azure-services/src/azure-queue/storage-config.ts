// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';

@injectable()
export class StorageConfig {
    public readonly scanQueue: string = process.env.AI_STORAGE_SCAN_QUEUE;

    public readonly privacyScanQueue: string = process.env.AI_STORAGE_PRIVACY_SCAN_QUEUE;
}
