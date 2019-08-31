// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { ItemType, UnProcessedPageScanRequest } from 'storage-documents';
import { UnProcessedPageScanRequestModel } from '../models/unprocessed-page-request-model';
import { Converter } from './converter';

@injectable()
export class UnprocessedScanRequestModelCreator implements Converter<UnProcessedPageScanRequest, UnProcessedPageScanRequestModel> {
    public convertToDocument(item: UnProcessedPageScanRequestModel): UnProcessedPageScanRequest {
        return {
            id: item.scanId,
            itemType: ItemType.UnProcessedPageScanRequests,
            partitionKey: 'unProcessedScanRequestDocuments',
            url: item.url,
            priority: item.priority,
        };
    }

    public convertToViewModel(item: UnProcessedPageScanRequest): UnProcessedPageScanRequestModel {
        return {
            scanId: item.id,
            url: item.url,
            priority: item.priority,
        };
    }
}
