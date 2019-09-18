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

        try {
            const pageScanRunResult = (await this.onDemandPageScanRunResultProvider.readScanRuns([scanMetadata.id]))[0];

            onDemandScanResult = {
                state: 'unknown',
                issueCount: 0,
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

            // start new web driver process
            browser = await this.webDriverTask.launch();

            // scan page for accessibility issues
            const axeScanResults: AxeScanResults = await this.scannerTask.scan(scanMetadata.url);

            onDemandPageScanRunResult.state = 'completed' as OnDemandPageScanRunState;
            onDemandPageScanRunResult.timestamp = new Date()
                .toJSON()
                .valueOf()
                .toString();

            onDemandScanResult.issueCount = axeScanResults.results.violations.length;
            onDemandScanResult.state = (onDemandScanResult.issueCount > 0 ? 'fail' : 'pass') as ScanState;

            pageScanRunResult.run = onDemandPageScanRunResult;
            pageScanRunResult.reports = [onDemandPageScanReport];
            pageScanRunResult.scanResult = onDemandScanResult;

            await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanRunResult);
        } finally {
            await this.webDriverTask.close();
        }
    }
}
