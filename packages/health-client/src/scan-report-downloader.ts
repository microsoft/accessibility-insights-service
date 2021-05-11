// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import * as path from 'path';
import { ensureDirectory, ResponseWithBodyType } from 'common';
import { Logger } from 'logger';
import { ScanReport, ScanResultResponse, ScanRunErrorResponse, ScanRunResultResponse } from 'service-library';

import { A11yServiceClient } from 'web-api-client';

export class ScanReportDownloader {
    private readonly downloadLocation: string;
    constructor(
        private readonly serviceClient: A11yServiceClient,
        downloadLocation: string,
        private readonly logger: Logger,
        private readonly fsObj: typeof fs = fs,
        ensureDirectoryFunc: typeof ensureDirectory = ensureDirectory,
    ) {
        this.downloadLocation = ensureDirectoryFunc(downloadLocation);
    }

    public async downloadReportsForScan(scanId: string, fileNameBase: string): Promise<void> {
        const scanStatusResponse = await this.serviceClient.getScanStatus(scanId);
        if (!this.validateScanStatusResponse(scanStatusResponse, scanId)) {
            return;
        }

        const reports = (scanStatusResponse.body as ScanRunResultResponse).reports;

        await Promise.all(reports.map((report: ScanReport) => this.downloadReport(report, scanId, fileNameBase)));
    }

    private validateScanStatusResponse(response: ResponseWithBodyType<ScanResultResponse>, scanId: string): boolean {
        if (response.statusCode < 200 || response.statusCode > 299) {
            this.logger.logError(`Get scan status for scanId ${scanId} failed with status code ${response.statusCode}`);

            return false;
        }
        const errorResponse = response.body as ScanRunErrorResponse;
        if (errorResponse.error) {
            this.logger.logError(`Scan with id ${scanId} failed with error: ${JSON.stringify(errorResponse.error)}`);

            return false;
        }
        const runResponse = response.body as ScanRunResultResponse;
        if (!runResponse.reports || runResponse.reports.length === 0) {
            this.logger.logError(`No reports found for scanId ${scanId}`);

            return false;
        }

        return true;
    }

    private async downloadReport(report: ScanReport, scanId: string, fileNameBase: string): Promise<void> {
        const reportResponse = await this.serviceClient.getScanReport(scanId, report.reportId);
        if (reportResponse.statusCode < 200 || reportResponse.statusCode > 299) {
            this.logger.logError(`Failed to fetch report ${report.reportId} with format ${report.format} for scan ${scanId}`);

            return;
        }
        const filePath = path.join(this.downloadLocation, `${fileNameBase}.${report.format}`);
        this.logger.logInfo(`Writing report to ${filePath}`);
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        this.fsObj.writeFileSync(filePath, reportResponse.body);
    }
}
