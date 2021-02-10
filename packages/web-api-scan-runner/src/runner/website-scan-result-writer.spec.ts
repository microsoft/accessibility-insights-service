// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { RetryHelper, System } from 'common';
import { WebsiteScanResultProvider } from 'service-library';
import { IMock, Mock, It } from 'typemoq';
import { OnDemandPageScanResult, WebsiteScanResult } from 'storage-documents';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { WebsiteScanResultWriter } from './website-scan-result-writer';

let loggerMock: IMock<MockableLogger>;
let websiteScanResultsProviderMock: IMock<WebsiteScanResultProvider>;
let retryHelperMock: IMock<RetryHelper<void>>;
let websiteScanResultWriter: WebsiteScanResultWriter;
let pageScanResult: OnDemandPageScanResult;
let websiteScanResultDbDocument: WebsiteScanResult;
let websiteScanResultDbDocumentUpdated: WebsiteScanResult;

const discoveryPatterns = ['pattern1', 'pattern2'];
const knownPages = ['page1', 'page2'];
const newPages = ['page3', 'page4'];
const discoveredUrls = [...knownPages, ...newPages];

describe(WebsiteScanResultWriter, () => {
    beforeEach(() => {
        websiteScanResultsProviderMock = Mock.ofType<WebsiteScanResultProvider>();
        retryHelperMock = Mock.ofType<RetryHelper<void>>();
        loggerMock = Mock.ofType<MockableLogger>();

        pageScanResult = {
            websiteScanRefs: [
                {
                    id: 'websiteScanId',
                    scanGroupType: 'deep-scan',
                },
            ],
        } as OnDemandPageScanResult;
        websiteScanResultDbDocument = {
            id: pageScanResult.websiteScanRefs[0].id,
            knownPages,
            _etag: 'etag',
        } as WebsiteScanResult;
        websiteScanResultDbDocumentUpdated = {
            ...websiteScanResultDbDocument,
            discoveryPatterns,
            knownPages: [...knownPages, ...newPages],
        } as WebsiteScanResult;

        setupRetryHelperMock();

        websiteScanResultWriter = new WebsiteScanResultWriter(
            websiteScanResultsProviderMock.object,
            retryHelperMock.object,
            loggerMock.object,
        );
    });

    afterEach(() => {
        websiteScanResultsProviderMock.verifyAll();
        retryHelperMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('update website scan result db document', async () => {
        const updatedWebsiteScanResult: Partial<WebsiteScanResult> = {
            id: websiteScanResultDbDocument.id,
            knownPages: [...websiteScanResultDbDocument.knownPages, ...newPages],
            _etag: websiteScanResultDbDocument._etag,
            discoveryPatterns: discoveryPatterns,
        };
        websiteScanResultsProviderMock
            .setup((o) => o.read(pageScanResult.websiteScanRefs[0].id))
            .returns(() => Promise.resolve(websiteScanResultDbDocument))
            .verifiable();
        websiteScanResultsProviderMock
            .setup((o) => o.mergeOrCreate(updatedWebsiteScanResult))
            .returns(() => Promise.resolve(websiteScanResultDbDocumentUpdated))
            .verifiable();
        loggerMock.setup((o) => o.logInfo('Successfully updated website scan result document.')).verifiable();

        const actualWebsiteScanResult = await websiteScanResultWriter.updateWebsiteScanResultWithDiscoveredUrls(
            pageScanResult,
            discoveredUrls,
            discoveryPatterns,
        );

        expect(actualWebsiteScanResult).toEqual(websiteScanResultDbDocumentUpdated);
    });

    it('failure to update website scan result db document', async () => {
        const dbError = 'cosmos db error';
        const updatedWebsiteScanResult: Partial<WebsiteScanResult> = {
            id: websiteScanResultDbDocument.id,
            knownPages: [...websiteScanResultDbDocument.knownPages, ...newPages],
            _etag: websiteScanResultDbDocument._etag,
            discoveryPatterns: discoveryPatterns,
        };
        websiteScanResultsProviderMock
            .setup((o) => o.read(pageScanResult.websiteScanRefs[0].id))
            .returns(() => Promise.resolve(websiteScanResultDbDocument))
            .verifiable();
        websiteScanResultsProviderMock
            .setup((o) => o.mergeOrCreate(updatedWebsiteScanResult))
            .returns(() => Promise.reject(dbError))
            .verifiable();
        loggerMock
            .setup((o) =>
                o.logError(`Failed to update website scan result document.`, {
                    error: System.serializeError(dbError),
                }),
            )
            .verifiable();

        await expect(
            websiteScanResultWriter.updateWebsiteScanResultWithDiscoveredUrls(pageScanResult, discoveredUrls, discoveryPatterns),
        ).rejects.toThrowError(`Failed to update website scan result document. Id: websiteScanId Error: '${dbError}'`);
    });
});

function setupRetryHelperMock(): void {
    retryHelperMock
        .setup((o) => o.executeWithRetries(It.isAny(), It.isAny(), 2, 1000))
        .returns(async (action: () => Promise<void>, errorHandler: (error: Error) => Promise<void>, retryCount: number) => {
            try {
                return await action();
            } catch (error) {
                await errorHandler(error);
                throw error;
            }
        })
        .verifiable();
}
