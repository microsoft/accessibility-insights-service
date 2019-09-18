// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { Browser } from 'puppeteer';
import { AxeScanResults } from 'scanner';
import { OnDemandPageScanRunResultProvider } from 'service-library';
import {
    OnDemandPageScanReport,
    OnDemandPageScanResult,
    OnDemandPageScanRunResult,
    OnDemandPageScanRunState,
    OnDemandScanResult,
    ReportFormat,
    ScanState,
} from 'storage-documents';
import { ScanMetadataConfig } from '../scan-metadata-config';
import { ScannerTask } from '../tasks/scanner-task';
import { WebDriverTask } from '../tasks/web-driver-task';

@injectable()
export class Runner {
    constructor(
        @inject(ScanMetadataConfig) private readonly scanMetadataConfig: ScanMetadataConfig,
        @inject(Logger) private readonly logger: Logger,
        @inject(ScannerTask) private readonly scannerTask: ScannerTask,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(WebDriverTask) private readonly webDriverTask: WebDriverTask,
    ) {}

    public async run(): Promise<void> {
        let browser: Browser;
        const scanMetadata = this.scanMetadataConfig.getConfig();
        let onDemandScanResult: OnDemandScanResult;
        let onDemandPageScanReport: OnDemandPageScanReport;
        let onDemandPageScanRunResult: OnDemandPageScanRunResult;
        let pageScanRunResult: OnDemandPageScanResult;
        let axeScanResults: AxeScanResults;

        try {
            pageScanRunResult = (await this.onDemandPageScanRunResultProvider.readScanRuns([scanMetadata.id]))[0];

            onDemandScanResult = {
                state: 'unknown',
                issueCount: undefined,
            };

            onDemandPageScanReport = {
                reportId: '',
                format: 'sarif',
                href: '',
            };

            // set scanned page run state to running
            onDemandPageScanRunResult = {
                state: 'running',
                timestamp: new Date()
                    .toJSON()
                    .valueOf()
                    .toString(),
                error: '',
            };

            pageScanRunResult.run = onDemandPageScanRunResult;

            await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanRunResult);
            pageScanRunResult = (await this.onDemandPageScanRunResultProvider.readScanRuns([scanMetadata.id]))[0];

            // start new web driver process
            browser = await this.webDriverTask.launch();

            // scan page for accessibility issues
            try {
                axeScanResults = await this.scannerTask.scan(scanMetadata.url);
            } catch (error) {
                onDemandPageScanRunResult.error = (error as Error).message;
            }

            onDemandPageScanRunResult.state = 'completed';
            onDemandPageScanRunResult.timestamp = new Date()
                .toJSON()
                .valueOf()
                .toString();

            if (axeScanResults !== undefined) {
                if (axeScanResults.results !== undefined) {
                    onDemandScanResult.state = 'pass';
                    if (axeScanResults.results.violations !== undefined && axeScanResults.results.violations.length > 0) {
                        onDemandScanResult.issueCount = axeScanResults.results.violations.length;
                        onDemandScanResult.state = 'fail';
                    }
                }
            }

            pageScanRunResult.run = onDemandPageScanRunResult;
            pageScanRunResult.reports = [onDemandPageScanReport];
            pageScanRunResult.scanResult = onDemandScanResult;

            await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanRunResult);
        } finally {
            await this.webDriverTask.close();
        }
    }
}
