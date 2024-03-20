// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator } from 'common';
import { Dictionary, keyBy } from 'lodash';
import moment from 'moment';
import {
    ApiController,
    OnDemandPageScanRunResultProvider,
    ScanResultResponse,
    WebsiteScanDataProvider,
    WebsiteScanResultProvider,
} from 'service-library';
import { OnDemandPageScanResult, WebsiteScanData, WebsiteScanResult } from 'storage-documents';
import { ScanResponseConverter } from '../converters/scan-response-converter';

// TODO Remove WebsiteScanResultProvider 30 days after deployment

export abstract class BaseScanResultController extends ApiController {
    protected abstract readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider;

    protected abstract readonly websiteScanResultProvider: WebsiteScanResultProvider;

    protected abstract readonly websiteScanDataProvider: WebsiteScanDataProvider;

    protected abstract readonly guidGenerator: GuidGenerator;

    protected abstract readonly scanResponseConverter: ScanResponseConverter;

    protected async isRequestMadeTooSoon(scanId: string): Promise<boolean> {
        const timeRequested = moment(this.guidGenerator.getGuidTimestamp(scanId));
        const timeCurrent = moment();
        const scanRequestProcessingDelayInSeconds = (await this.getRestApiConfig()).scanRequestProcessingDelayInSeconds;

        return timeRequested.add(scanRequestProcessingDelayInSeconds, 'seconds').isAfter(timeCurrent);
    }

    protected async getScanResultMapKeyByScanId(scanIds: string[]): Promise<Dictionary<OnDemandPageScanResult>> {
        const scanResultItems = await this.onDemandPageScanRunResultProvider.readScanRuns(scanIds);

        return keyBy(scanResultItems, (item) => item.id);
    }

    protected async getWebsiteScanResult(pageScanResult: OnDemandPageScanResult): Promise<WebsiteScanResult | WebsiteScanData> {
        if (pageScanResult.schemaVersion === '2') {
            return this.websiteScanDataProvider.read(pageScanResult.websiteScanRef.id);
        } else {
            // Expand scan result for original scan only. Result for descendant scans do not include deep scan result collection.
            const expandResult = pageScanResult.id === pageScanResult.deepScanId;

            return this.websiteScanResultProvider.read(pageScanResult.websiteScanRef.id, expandResult);
        }
    }

    protected getTooSoonRequestResponse(scanId: string): ScanResultResponse {
        return {
            scanId,
            url: undefined,
            scanType: undefined,
            run: {
                state: 'pending',
            },
        };
    }

    protected isScanIdValid(scanId: string): boolean {
        return (
            this.guidGenerator.isValidV6Guid(scanId) &&
            // also check the guid is generated in the past with 10 second buffer.
            moment(this.guidGenerator.getGuidTimestamp(scanId)).isBefore(moment().add(10, 'seconds'))
        );
    }

    protected async getScanResultResponse(
        pageScanResult: OnDemandPageScanResult,
        websiteScanData: WebsiteScanResult | WebsiteScanData,
    ): Promise<ScanResultResponse> {
        const segment = '/api/';
        const baseUrl = this.context.req.url.substring(0, this.context.req.url.indexOf(segment) + segment.length);

        return this.scanResponseConverter.getScanResultResponse(baseUrl, this.apiVersion, pageScanResult, websiteScanData);
    }
}
