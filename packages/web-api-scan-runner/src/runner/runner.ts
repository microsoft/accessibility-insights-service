// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { convertAxeToSarif, SarifLog } from 'axe-sarif-converter';
import { GuidGenerator } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { Browser } from 'puppeteer';
import { AxeScanResults } from 'scanner';
import { OnDemandPageScanRunResultProvider, PageScanRunReportService } from 'service-library';
import { OnDemandPageScanReport, OnDemandPageScanResult, OnDemandPageScanRunResult, OnDemandScanResult } from 'storage-documents';
import { ScanMetadataConfig } from '../scan-metadata-config';
import { ScannerTask } from '../tasks/scanner-task';
import { WebDriverTask } from '../tasks/web-driver-task';

@injectable()
export class Runner {
    constructor(
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(ScanMetadataConfig) private readonly scanMetadataConfig: ScanMetadataConfig,
        @inject(ScannerTask) private readonly scannerTask: ScannerTask,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(WebDriverTask) private readonly webDriverTask: WebDriverTask,
        @inject(Logger) private readonly logger: Logger,
        @inject(PageScanRunReportService) private readonly pageScanRunReportService: PageScanRunReportService,
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
            this.logger.logInfo(`Reading Page Scan Run id= ${scanMetadata.id}`);
            pageScanRunResult = (await this.onDemandPageScanRunResultProvider.readScanRuns([scanMetadata.id]))[0];

            onDemandScanResult = {
                state: 'unknown',
                issueCount: undefined,
            };

            onDemandPageScanReport = {
                reportId: this.guidGenerator.createGuid(),
                format: 'sarif',
                href: '',
            };

            // set scanned page run state to running
            onDemandPageScanRunResult = {
                state: 'running',
                timestamp: new Date().toJSON(),
                error: '',
            };

            pageScanRunResult.run = onDemandPageScanRunResult;

            this.logger.logInfo(`Changing page status to running`);
            this.logger.logInfo(`Updating page scan in database`);
            await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanRunResult);
            pageScanRunResult = (await this.onDemandPageScanRunResultProvider.readScanRuns([scanMetadata.id]))[0];

            // start new web driver process
            browser = await this.webDriverTask.launch();

            this.logger.logInfo(`Running Scan`);
            // scan page for accessibility issues
            try {
                axeScanResults = await this.scannerTask.scan(scanMetadata.url);
            } catch (error) {
                onDemandPageScanRunResult.error = (error as Error).message;
                this.logger.logInfo(`Scan failed ${error}`);
            }

            this.logger.logInfo(`Changing page status to completed`);
            onDemandPageScanRunResult.state = 'completed';
            onDemandPageScanRunResult.timestamp = new Date().toJSON();

            if (axeScanResults !== undefined) {
                if (axeScanResults.results !== undefined) {
                    onDemandScanResult.state = 'pass';
                    if (axeScanResults.results.violations !== undefined && axeScanResults.results.violations.length > 0) {
                        onDemandScanResult.issueCount = axeScanResults.results.violations.length;
                        onDemandScanResult.state = 'fail';
                    }
                    this.logger.logInfo(`Converting to Sarif...`);
                    // Perform the conversion
                    const sarifResults: SarifLog = convertAxeToSarif(axeScanResults.results);
                    this.logger.logInfo(`Saving sarif results to Blobs...`);
                    await this.pageScanRunReportService.saveSarifReport(onDemandPageScanReport.reportId, JSON.stringify(sarifResults));
                    onDemandPageScanReport.href = this.pageScanRunReportService.getBlobFilePath(
                        onDemandPageScanReport.reportId,
                        onDemandPageScanReport.format,
                    );
                    this.logger.logInfo(`File saved at ${onDemandPageScanReport.href}`);
                }
            }

            pageScanRunResult.run = onDemandPageScanRunResult;
            pageScanRunResult.reports = [onDemandPageScanReport];
            pageScanRunResult.scanResult = onDemandScanResult;

            this.logger.logInfo(`Updating page scan in database`);
            await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanRunResult);
        } finally {
            await this.webDriverTask.close();
        }
    }
}
