// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { ItemType, OnDemandPageScanBatchRequest } from 'storage-documents';

// tslint:disable-next-line: no-any
export async function run(context: Context, documents: OnDemandPageScanBatchRequest[]): Promise<void> {
    if (documents.length === 0) {
        return;
    }

    const batchRequestDocuments = documents.find(d => d.itemType === ItemType.scanRunBatchRequest);

    console.log(JSON.stringify(batchRequestDocuments));

    return;
}
