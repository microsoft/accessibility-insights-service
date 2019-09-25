// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { GuidGenerator } from 'common';
import { Dictionary, isEmpty, keyBy } from 'lodash';
import { ApiController, OnDemandPageScanRunResultProvider } from 'service-library';
import { ItemType, OnDemandPageScanResult } from 'storage-documents';
import { RunState, ScanReport, ScanResultErrorResponse, ScanResultResponse } from './../api-contracts/scan-result-response';

export abstract class BaseScanResultController extends ApiController {
    protected abstract readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider;
    protected abstract readonly guidGenerator: GuidGenerator;

    // tslint:disable-next-line: no-any
    protected abstract handleInvalidRequest(scanId: string): void;

    protected async isRequestMadeTooSoon(scanId: string): Promise<boolean> {
        const timeRequested = this.getScanRequestedTime(scanId);
        const timeCurrent = new Date();
        const minimumWaitTimeforScanResultQueryInSeconds = (await this.getRestApiConfig()).minimumWaitTimeforScanResultQueryInSeconds;

        return timeCurrent.getTime() - timeRequested.getTime() <= minimumWaitTimeforScanResultQueryInSeconds * 1000;
    }

    protected async isCosmosTriggerNotDone(scanId: string): Promise<boolean> {
        const timeRequested = this.getScanRequestedTime(scanId);
        const timeCurrent = new Date();
        const minimumWaitTimeforCosmosTriggerInSeconds = (await this.getRestApiConfig()).minimumWaitTimeforCosmosTriggerInSeconds;

        return timeCurrent.getTime() - timeRequested.getTime() <= minimumWaitTimeforCosmosTriggerInSeconds * 1000;
    }

    protected async getScanResultMapKeyByScanId(scanIds: string[]): Promise<Dictionary<OnDemandPageScanResult>> {
        const scanResultItems = await this.onDemandPageScanRunResultProvider.readScanRuns(scanIds);

        return keyBy(scanResultItems, item => item.id);
    }

    protected getScanRequestedTime(scanId: string): Date {
        return this.guidGenerator.getGuidTimestamp(scanId);
    }

    protected getCosmosTriggerNotDoneResponse(scanId: string): ScanResultResponse {
        return this.getScanResultResponse(scanId, 'accepted');
    }

    protected getTooSoonRequestResponse(scanId: string): ScanResultResponse {
        return this.getScanResultResponse(scanId, 'accepted');
    }

    protected get404Response(scanId: string): ScanResultResponse {
        return this.getScanResultResponse(scanId, 'not found');
    }

    protected getScanResultResponse(scanId: string, state: RunState): ScanResultResponse {
        return {
            scanId,
            url: undefined,
            run: {
                state,
            },
        };
    }

    protected isScanIdValid(scanId: string): boolean {
        return this.guidGenerator.isValidV6Guid(scanId);
    }

    // tslint:disable-next-line: no-any
    protected getInvalidRequestResponse(scanId: string): ScanResultErrorResponse {
        return {
            scanId: scanId,
            error: `Unprocessable Entity: ${scanId}.`,
        };
    }

    protected getResponseFromDbDocument(dbDocument: OnDemandPageScanResult): ScanResultResponse {
        let reports: ScanReport[] = [];
        if (!isEmpty(dbDocument.reports)) {
            reports = dbDocument.reports.map(report => {
                return {
                    reportId: report.reportId,
                    format: report.format,
                };
            });
        }

        return {
            scanId: dbDocument.id,
            url: dbDocument.url,
            scanResult: dbDocument.scanResult,
            reports: reports,
            run: dbDocument.run,
        };
    }
}
