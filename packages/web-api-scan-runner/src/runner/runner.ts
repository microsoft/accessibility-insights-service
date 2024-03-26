// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { AxeScanResults } from 'scanner-global-library';
import {
    OnDemandPageScanRunResultProvider,
    WebsiteScanDataProvider,
    ReportWriter,
    ReportGeneratorRequestProvider,
    ScanNotificationProcessor,
    RunnerScanMetadata,
} from 'service-library';
import {
    OnDemandPageScanReport,
    OnDemandPageScanResult,
    OnDemandPageScanRunState,
    OnDemandScanResult,
    ScanError,
    ReportGeneratorRequest,
    KnownPage,
    WebsiteScanData,
} from 'storage-documents';
import { System, ServiceConfiguration, GuidGenerator, ScanRunTimeConfig } from 'common';
import { isEmpty, isString } from 'lodash';
import { ReportGenerator } from '../report-generator/report-generator';
import { RunnerScanMetadataConfig } from '../runner-scan-metadata-config';
import { ScanRunnerTelemetryManager } from '../scan-runner-telemetry-manager';
import { PageScanProcessor } from '../processor/page-scan-processor';

@injectable()
export class Runner {
    constructor(
        @inject(RunnerScanMetadataConfig) private readonly runnerScanMetadataConfig: RunnerScanMetadataConfig,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(WebsiteScanDataProvider) protected readonly websiteScanDataProvider: WebsiteScanDataProvider,
        @inject(ReportGeneratorRequestProvider) private readonly reportGeneratorRequestProvider: ReportGeneratorRequestProvider,
        @inject(PageScanProcessor) private readonly pageScanProcessor: PageScanProcessor,
        @inject(ReportWriter) protected readonly reportWriter: ReportWriter,
        @inject(ReportGenerator) private readonly reportGenerator: ReportGenerator,
        @inject(ScanNotificationProcessor) protected readonly scanNotificationProcessor: ScanNotificationProcessor,
        @inject(ScanRunnerTelemetryManager) private readonly telemetryManager: ScanRunnerTelemetryManager,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(GuidGenerator) protected readonly guidGenerator: GuidGenerator,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async run(): Promise<void> {
        const runnerScanMetadata = this.runnerScanMetadataConfig.getConfig();
        // Decode URL back from docker parameter encoding
        runnerScanMetadata.url = decodeURIComponent(runnerScanMetadata.url);

        this.logger.setCommonProperties({ scanId: runnerScanMetadata.id, url: runnerScanMetadata.url });
        this.logger.logInfo('Starting accessibility page scan task.');

        const pageScanResult = await this.updateScanRunStateToRunning(runnerScanMetadata.id);
        if (pageScanResult === undefined) {
            this.logger.logWarn('Page scan result document not found in storage.');

            return;
        }

        let websiteScanData = await this.websiteScanDataProvider.read(pageScanResult.websiteScanRef.id);

        this.telemetryManager.trackScanStarted(runnerScanMetadata.id);
        let axeScanResults: AxeScanResults;
        try {
            axeScanResults = await this.pageScanProcessor.scan(runnerScanMetadata, pageScanResult, websiteScanData);
            if (axeScanResults?.unscannable === true) {
                // unscannable URL
                this.setRunResult(pageScanResult, 'unscannable', axeScanResults.scannedUrl, axeScanResults.error);
            } else if (axeScanResults.error === undefined) {
                // axe scan completed successfully
                await this.onCompletedScan(axeScanResults, pageScanResult);
            } else {
                // axe scan has failed
                await this.onFailedScan(axeScanResults, pageScanResult);
            }

            pageScanResult.run.pageTitle = axeScanResults.pageTitle;
            pageScanResult.run.pageResponseCode = axeScanResults.pageResponseCode;
        } catch (error) {
            const errorMessage = System.serializeError(error);
            this.setRunResult(pageScanResult, 'failed', axeScanResults?.scannedUrl, errorMessage);

            this.logger.logError(`The scanner failed to scan a page.`, { error: errorMessage });
            this.telemetryManager.trackScanTaskFailed();
        } finally {
            this.telemetryManager.trackScanCompleted();
        }

        websiteScanData = await this.updateScanResult(runnerScanMetadata, pageScanResult, websiteScanData);
        if (this.isScanWorkflowCompleted(pageScanResult) || (await this.isPageScanFailed(pageScanResult))) {
            await this.scanNotificationProcessor.sendScanCompletionNotification(pageScanResult, websiteScanData);
        }

        this.logger.logInfo('Accessibility page scan task completed.');
    }

    private async onCompletedScan(axeScanResults: AxeScanResults, pageScanResult: OnDemandPageScanResult): Promise<void> {
        pageScanResult.scanResult = this.getScanStatus(axeScanResults);
        pageScanResult.reports = await this.generateScanReports(axeScanResults);

        if (this.isScanWorkflowCompleted(pageScanResult)) {
            this.setRunResult(pageScanResult, 'completed', axeScanResults.scannedUrl);
        } else {
            await this.sendGenerateConsolidatedReportRequest(pageScanResult);
            this.setRunResult(pageScanResult, 'report', axeScanResults.scannedUrl);
        }
    }

    private async onFailedScan(axeScanResults: AxeScanResults, pageScanResult: OnDemandPageScanResult): Promise<void> {
        this.setRunResult(pageScanResult, 'failed', axeScanResults.scannedUrl, axeScanResults.error);
        this.logger.logError('Browser has failed to scan a page.', { error: JSON.stringify(axeScanResults.error) });
        this.telemetryManager.trackBrowserScanFailed();
    }

    private async updateScanResult(
        runnerScanMetadata: RunnerScanMetadata,
        pageScanResult: Partial<OnDemandPageScanResult>,
        websiteScanData: WebsiteScanData,
    ): Promise<WebsiteScanData> {
        await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanResult);

        const scanConfig = await this.getScanConfig();
        const runState =
            (['completed', 'unscannable'] as OnDemandPageScanRunState[]).includes(pageScanResult.run.state) ||
            pageScanResult.run.retryCount >= scanConfig.maxFailedScanRetryCount
                ? pageScanResult.run.state
                : undefined;
        const pageState: KnownPage = {
            scanId: runnerScanMetadata.id,
            url: runnerScanMetadata.url,
            scanState: pageScanResult.scanResult?.state,
            runState,
        };

        return this.websiteScanDataProvider.updateKnownPages(websiteScanData, [pageState]);
    }

    private async updateScanRunStateToRunning(scanId: string): Promise<OnDemandPageScanResult> {
        this.logger.logInfo(`Updating page scan run state to 'running'.`);
        const partialPageScanResult: Partial<OnDemandPageScanResult> = {
            id: scanId,
            run: {
                state: 'running',
                timestamp: new Date().toJSON(),
                error: null,
            },
            scanResult: null,
            reports: null,
        };
        const response = await this.onDemandPageScanRunResultProvider.tryUpdateScanRun(partialPageScanResult);
        if (!response.succeeded) {
            this.logger.logWarn(
                `Update page scan run state to 'running' failed due to merge conflict with other process. Exiting page scan task.`,
            );

            return undefined;
        }

        return response.result;
    }

    private async generateScanReports(axeResults: AxeScanResults): Promise<OnDemandPageScanReport[]> {
        this.logger.logInfo(`Generating reports from scan results.`);
        const reports = this.reportGenerator.generateReports(axeResults);
        const availableReports = reports.filter((r) => !isEmpty(r.content));

        return this.reportWriter.writeBatch(availableReports);
    }

    private setRunResult(
        pageScanResult: OnDemandPageScanResult,
        state: OnDemandPageScanRunState,
        scannedUrl: string,
        error?: string | ScanError,
    ): void {
        pageScanResult.scannedUrl = scannedUrl;
        pageScanResult.run = {
            ...pageScanResult.run,
            state,
            timestamp: new Date().toJSON(),
            error: isString(error) ? error.substring(0, 2048) : error,
        };

        if (state === 'report') {
            pageScanResult.subRuns = {
                report: {
                    state: 'pending',
                    timestamp: new Date().toJSON(),
                    error: null,
                },
            };
        }
    }

    private getScanStatus(axeResults: AxeScanResults): OnDemandScanResult {
        if (axeResults?.results?.violations !== undefined && axeResults.results.violations.length > 0) {
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

    private async sendGenerateConsolidatedReportRequest(pageScanResult: OnDemandPageScanResult): Promise<void> {
        if (pageScanResult.websiteScanRef.scanGroupType === 'single-scan') {
            return;
        }

        const reportGeneratorRequest: Partial<ReportGeneratorRequest> = {
            id: this.guidGenerator.createGuidFromBaseGuid(pageScanResult.id),
            scanId: pageScanResult.id,
            scanGroupId: pageScanResult.websiteScanRef.scanGroupId,
            targetReport: 'accessibility',
            priority: pageScanResult.priority,
        };
        await this.reportGeneratorRequestProvider.writeRequest(reportGeneratorRequest);

        this.logger.logInfo('Submitted request to generate consolidated report.', {
            id: reportGeneratorRequest.id,
            scanGroupId: pageScanResult.websiteScanRef.scanGroupId,
        });
    }

    // The scan workflow is completed when there is no combined report to generate
    // or loaded URL location is not supported
    private isScanWorkflowCompleted(pageScanResult: OnDemandPageScanResult): boolean {
        return pageScanResult.run?.state === 'unscannable' || pageScanResult.websiteScanRef.scanGroupType === 'single-scan';
    }

    private async isPageScanFailed(pageScanResult: OnDemandPageScanResult): Promise<boolean> {
        const scanConfig = await this.getScanConfig();

        // Retry count is set by request sender
        return pageScanResult.run.state === 'failed' && pageScanResult.run.retryCount >= scanConfig.maxFailedScanRetryCount;
    }

    private async getScanConfig(): Promise<ScanRunTimeConfig> {
        return this.serviceConfig.getConfigValue('scanConfig');
    }
}
