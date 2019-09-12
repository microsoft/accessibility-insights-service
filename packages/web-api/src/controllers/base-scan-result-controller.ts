// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { GuidGenerator } from 'common';
import { Dictionary, keyBy } from 'lodash';
import { OnDemandPageScanRunResultProvider } from 'service-library';
import { InvalidOnDemandPageScanResultResponse, ItemType, OnDemandPageScanResult } from 'storage-documents';

import { ApiController } from './api-controller';

export abstract class BaseScanResultController extends ApiController {
    protected abstract readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider;
    protected abstract readonly guidGenerator: GuidGenerator;

    // tslint:disable-next-line: no-any
    protected abstract handleInvalidRequest(scanId: string, error: any): void;

    protected async isRequestMadeTooSoon(scanId: string): Promise<boolean> {
        const timeRequested = this.tryGetScanRequestedTime(scanId);
        if (timeRequested === undefined) {
            // the scanId is invalid.
            return undefined;
        }
        const timeCurrent = new Date();
        const minimumWaitTimeforScanResultQueryInSeconds = (await this.getRestApiConfig()).minimumWaitTimeforScanResultQueryInSeconds;

        return timeCurrent.getTime() - timeRequested.getTime() <= minimumWaitTimeforScanResultQueryInSeconds * 1000;
    }

    protected async getScanResultMapKeyByScanId(scanIds: string[]): Promise<Dictionary<OnDemandPageScanResult>> {
        const scanResultItems = await this.onDemandPageScanRunResultProvider.readScanRuns(scanIds);

        return keyBy(scanResultItems, item => item.id);
    }

    protected tryGetScanRequestedTime(scanId: string): Date {
        try {
            return this.guidGenerator.getGuidTimestamp(scanId);
        } catch (error) {
            this.handleInvalidRequest(scanId, error);
        }

        return undefined;
    }

    protected getTooSoonRequestResponse(scanId: string): OnDemandPageScanResult {
        return {
            id: scanId,
            partitionKey: undefined,
            url: undefined,
            run: {
                state: 'accepted',
            },
            priority: undefined,
            itemType: ItemType.onDemandPageScanRunResult,
        };
    }

    protected get404Response(scanId: string): OnDemandPageScanResult {
        return {
            id: scanId,
            partitionKey: undefined,
            url: undefined,
            run: {
                state: 'unknown',
            },
            priority: undefined,
            itemType: ItemType.onDemandPageScanRunResult,
        };
    }

    // tslint:disable-next-line: no-any
    protected getInvalidRequestResponse(scanId: string, error?: any): InvalidOnDemandPageScanResultResponse {
        return {
            id: scanId,
            error: `Unprocessable Entity: ${scanId}. ${error === undefined ? '' : error}`,
        };
    }
}
