// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator } from 'common';
import { Dictionary, keyBy } from 'lodash';
import moment from 'moment';
import { ApiController, OnDemandPageScanRunResultProvider, ScanResultResponse, WebsiteScanResultProvider } from 'service-library';
import { OnDemandPageScanResult, WebsiteScanResult, ScanGroupType } from 'storage-documents';
import { ScanResponseConverter } from '../converters/scan-response-converter';

export abstract class BaseScanResultController extends ApiController {
    protected abstract readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider;
    protected abstract readonly websiteScanResultProvider: WebsiteScanResultProvider;
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

    protected async getWebsiteScanResult(
        pageScanResult: OnDemandPageScanResult,
        scanGroupType: ScanGroupType = 'deep-scan',
    ): Promise<WebsiteScanResult> {
        const websiteScanRef = pageScanResult.websiteScanRefs?.find((ref) => ref.scanGroupType === scanGroupType);
        if (websiteScanRef) {
            return this.websiteScanResultProvider.read(websiteScanRef.id);
        }

        return undefined;
    }

    protected getTooSoonRequestResponse(scanId: string): ScanResultResponse {
        return {
            scanId,
            url: undefined,
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

    protected getScanResultResponse(pageScanResult: OnDemandPageScanResult, websiteScanResult: WebsiteScanResult): ScanResultResponse {
        const segment = '/api/';
        const baseUrl = this.context.req.url.substring(0, this.context.req.url.indexOf(segment) + segment.length);

        return this.scanResponseConverter.getScanResultResponse(baseUrl, this.apiVersion, pageScanResult, websiteScanResult);
    }
}
