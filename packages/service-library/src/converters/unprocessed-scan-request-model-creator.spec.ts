// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';
import { ItemType, UnProcessedPageScanRequest } from 'storage-documents';
import { UnProcessedPageScanRequestModel } from '../models/unprocessed-page-request-model';
import { UnprocessedScanRequestModelCreator } from './unprocessed-scan-request-model-creator';

describe(UnprocessedScanRequestModelCreator, () => {
    let testSubject: UnprocessedScanRequestModelCreator;
    const storageDocument: UnProcessedPageScanRequest = {
        id: 'scan-id1',
        partitionKey: 'unProcessedScanRequestDocuments',
        itemType: ItemType.UnProcessedPageScanRequests,
        url: 'url1',
        priority: 100,
    };
    const viewModel: UnProcessedPageScanRequestModel = {
        scanId: 'scan-id1',
        url: 'url1',
        priority: 100,
    };

    beforeEach(() => {
        testSubject = new UnprocessedScanRequestModelCreator();
    });

    it('converts to view model', () => {
        expect(testSubject.convertToViewModel(storageDocument)).toEqual(viewModel);
    });

    it('converts to storage document', () => {
        expect(testSubject.convertToDocument(viewModel)).toEqual(storageDocument);
    });
});
