// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { convertAxeToSarif, SarifLog } from 'axe-sarif-converter';
import { GuidGenerator } from 'common';
import { inject, injectable } from 'inversify';
import { isNil } from 'lodash';
import { Logger, ScanTaskCompletedMeasurements } from 'logger';
import { Browser } from 'puppeteer';
import { AxeScanResults } from 'scanner';
import { OnDemandPageScanRunResultProvider, PageScanRunReportService } from 'service-library';
import {
    OnDemandPageScanReport,
    OnDemandPageScanResult,
    OnDemandPageScanRunResult,
    OnDemandPageScanRunState,
    OnDemandScanResult,
} from 'storage-documents';
import { ScanMetadataConfig } from '../scan-metadata-config';
import { ScannerTask } from '../tasks/scanner-task';
import { WebDriverTask } from '../tasks/web-driver-task';

// tslint:disable: no-null-keyword no-any

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
        private readonly convertAxeToSarifFunc = convertAxeToSarif,
    ) {}

    public async run(): Promise<void> {
        let browser: Browser;
        let pageScanResult: OnDemandPageScanResult;
        const scanMetadata = this.scanMetadataConfig.getConfig();

        const scanStartedTimestamp: number = Date.now();
        const scanSubmittedTimestamp: number = this.guidGenerator.getGuidTimestamp(scanMetadata.id).getTime();

        this.logger.logInfo(`Reading page scan run result.`);
        pageScanResult = await this.onDemandPageScanRunResultProvider.readScanRun(scanMetadata.id);
        this.logger.setCustomProperties({ scanId: scanMetadata.id, batchRequestId: pageScanResult.batchRequestId });

        this.logger.trackEvent('ScanTaskStarted', undefined, { scanWaitTime: (scanStartedTimestamp - scanSubmittedTimestamp) / 1000 });

        this.logger.logInfo(`Updating page scan run result state to running.`);
        pageScanResult = this.resetPageScanResultState(pageScanResult);
        pageScanResult = await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanResult);

        try {
            browser = await this.webDriverTask.launch();
            await this.scan(pageScanResult);
        } catch (error) {
            const errorMessage = this.getErrorMessage(error);
            pageScanResult.run = this.createRunResult('failed', errorMessage);
            this.logger.logInfo(`Page scan run failed.`, { error: errorMessage });
            this.logger.trackEvent('ScanTaskFailed');
        } finally {
            const scanCompletedTimestamp: number = Date.now();
            const telemetryMeasurements: ScanTaskCompletedMeasurements = {
                scanExecutionTime: (scanCompletedTimestamp - scanStartedTimestamp) / 1000,
                scanTotalTime: (scanCompletedTimestamp - scanSubmittedTimestamp) / 1000,
            };
            this.logger.trackEvent('ScanTaskCompleted', undefined, telemetryMeasurements);
            try {
                await this.webDriverTask.close();
            } catch (error) {
                this.logger.logError(`Unable to close the web driver instance.`, { error: this.getErrorMessage(error) });
            }
        }

        this.logger.logInfo(`Writing page scan run result to a storage.`);
        await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanResult);
    }

    private async scan(pageScanResult: OnDemandPageScanResult): Promise<void> {
        this.logger.logInfo(`Running page scan.`);

        const axeScanResults = await this.scannerTask.scan(pageScanResult.url);

        if (!isNil(axeScanResults.error)) {
            this.logger.logInfo(`Updating page scan run result state to failed`);
            this.logger.trackEvent('ScanTaskFailed');
            pageScanResult.run = this.createRunResult('failed', axeScanResults.error);
        } else {
            this.logger.logInfo(`Updating page scan run result state to completed`);
            this.logger.trackEvent('ScanTaskSucceeded');
            pageScanResult.run = this.createRunResult('completed');
            pageScanResult.scanResult = this.getScanStatus(axeScanResults);
            pageScanResult.reports = [await this.saveScanReport(axeScanResults)];
            if (axeScanResults.scannedUrl !== undefined) {
                pageScanResult.scannedUrl = axeScanResults.scannedUrl;
            }
        }
    }

    private resetPageScanResultState(originPageScanResult: OnDemandPageScanResult): OnDemandPageScanResult {
        originPageScanResult.scanResult = null;
        originPageScanResult.reports = null;
        originPageScanResult.run = {
            state: 'running',
            timestamp: new Date().toJSON(),
            error: null,
        };

        return originPageScanResult;
    }

    private createRunResult(state: OnDemandPageScanRunState, error?: string): OnDemandPageScanRunResult {
        return {
            state,
            timestamp: new Date().toJSON(),
            error,
        };
    }

    private getScanStatus(axeResults: AxeScanResults): OnDemandScanResult {
        if (axeResults.results.violations !== undefined && axeResults.results.violations.length > 0) {
            return {
                state: 'fail',
                issueCount: axeResults.results.violations.reduce((a, b) => a + b.nodes.length, 0),
            };
        } else {
            return {
                state: 'pass',
            };
        }
    }

    private async saveScanReport(axeResults: AxeScanResults): Promise<OnDemandPageScanReport> {
        this.logger.logInfo(`Converting scan run result to Sarif.`);
        axeResults.results.inapplicable = [];
        axeResults.results.incomplete = [];
        axeResults.results.passes = [];
        const sarifResults: SarifLog = this.convertAxeToSarifFunc(axeResults.results);

        this.logger.logInfo(`Saving Sarif report to a blob storage.`);
        const reportId = this.guidGenerator.createGuid();
        const href = await this.pageScanRunReportService.saveSarifReport(reportId, JSON.stringify(sarifResults));
        this.logger.logInfo(`Sarif report saved to a blob ${href}`);

        return {
            format: 'sarif',
            href,
            reportId,
        };
    }

    private getErrorMessage(error: any): string {
        return error instanceof Error ? error.message : JSON.stringify(error);
    }
}
