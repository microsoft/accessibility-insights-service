// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { FeatureFlags, GuidGenerator, ServiceConfiguration, System, RetryHelper } from 'common';
import { inject, injectable } from 'inversify';
import { isEmpty, isNil } from 'lodash';
import { GlobalLogger } from 'logger';
import { AxeScanResults, Page } from 'scanner-global-library';
import {
    OnDemandPageScanRunResultProvider,
    PageScanRunReportProvider,
    WebsiteScanResultProvider,
    CombinedScanResultsProvider,
    CombinedScanResultsReadResponse,
} from 'service-library';
import {
    CombinedScanResults,
    OnDemandNotificationRequestMessage,
    OnDemandPageScanReport,
    OnDemandPageScanResult,
    OnDemandPageScanRunResult,
    OnDemandPageScanRunState,
    OnDemandScanResult,
    ScanError,
    WebsiteScanResult,
    WebsiteScanReport,
} from 'storage-documents';
import { AxeResultsReducer } from 'axe-result-converter';
import axe from 'axe-core';
import { GeneratedReport, ReportGenerator } from '../report-generator/report-generator';
import { ScanMetadataConfig } from '../scan-metadata-config';
import { Scanner } from '../scanner/scanner';
import { NotificationQueueMessageSender } from '../sender/notification-queue-message-sender';
import { DeepScanner } from '../crawl-runner/deep-scanner';
import { ScanMetadata } from '../types/scan-metadata';
import { ScanRunnerTelemetryManager } from '../scan-runner-telemetry-manager';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class Runner {
    private readonly maxCombinedResultProcessingRetryCount = 2;

    constructor(
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(ScanMetadataConfig) private readonly scanMetadataConfig: ScanMetadataConfig,
        @inject(Scanner) private readonly scanner: Scanner,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(PageScanRunReportProvider) private readonly pageScanRunReportProvider: PageScanRunReportProvider,
        @inject(ReportGenerator) private readonly reportGenerator: ReportGenerator,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(NotificationQueueMessageSender) protected readonly notificationDispatcher: NotificationQueueMessageSender,
        @inject(WebsiteScanResultProvider) protected readonly websiteScanResultProvider: WebsiteScanResultProvider,
        @inject(CombinedScanResultsProvider) protected readonly combinedScanResultsProvider: CombinedScanResultsProvider,
        @inject(AxeResultsReducer) protected readonly axeResultsReducer: AxeResultsReducer,
        @inject(RetryHelper) private readonly retryHelper: RetryHelper<void>,
        @inject(Page) private readonly page: Page,
        @inject(DeepScanner) private readonly deepScanner: DeepScanner,
        @inject(ScanRunnerTelemetryManager) private readonly telemetryManager: ScanRunnerTelemetryManager,
    ) {}

    public async run(): Promise<void> {
        const scanMetadata = this.scanMetadataConfig.getConfig();
        this.logger.setCommonProperties({ scanId: scanMetadata.id, url: scanMetadata.url });
        this.logger.logInfo('Starting page scan task.');

        const pageScanResult = await this.updateScanRunState(scanMetadata.id);
        if (pageScanResult === undefined) {
            return;
        }

        const scanSubmittedTimestamp = this.guidGenerator.getGuidTimestamp(scanMetadata.id);
        this.telemetryManager.trackScanStarted(scanSubmittedTimestamp);

        let axeScanResults: AxeScanResults;
        try {
            await this.openPage(scanMetadata.url);
            axeScanResults = await this.scan(pageScanResult, this.page);

            await this.deepScan(scanMetadata, pageScanResult);

            await this.generateCombinedScanResults(axeScanResults, pageScanResult);
            this.logger.logInfo('The scanner successfully completed a page scan.');
        } catch (error) {
            const errorMessage = System.serializeError(error);
            pageScanResult.run = this.createRunResult('failed', errorMessage);

            this.telemetryManager.trackScanFailed();
        } finally {
            await this.closePage();
            this.telemetryManager.trackScanCompleted();
        }

        await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanResult);
        await this.queueScanCompletionNotification(pageScanResult);

        this.logger.logInfo('Page scan task completed.');
    }

    private async openPage(url: string): Promise<void> {
        await this.page.create();
        await this.page.navigateToUrl(url);
    }

    private async closePage(): Promise<void> {
        try {
            await this.page.close();
        } catch (error) {
            this.logger.logError('An error occurred while closing web browser.', { error: System.serializeError(error) });
        }
    }

    private async generateCombinedScanResults(axeScanResults: AxeScanResults, pageScanResult: OnDemandPageScanResult): Promise<void> {
        await this.retryHelper.executeWithRetries(
            async () => this.generateCombinedScanResultsImpl(axeScanResults, pageScanResult),
            async (error: Error) => {
                this.logger.logError(`Failure to generate combined scan result. Retrying on error.`, {
                    error: System.serializeError(error),
                });
            },
            this.maxCombinedResultProcessingRetryCount,
            1000,
        );
    }

    private async generateCombinedScanResultsImpl(axeScanResults: AxeScanResults, pageScanResult: OnDemandPageScanResult): Promise<void> {
        if (axeScanResults === undefined || pageScanResult.websiteScanRefs === undefined || pageScanResult.websiteScanRefs.length === 0) {
            return;
        }

        const websiteScanRef = pageScanResult.websiteScanRefs.find((ref) => ref.scanGroupType === 'consolidated-scan-report');
        if (websiteScanRef === undefined) {
            return;
        }

        const websiteScanResult = await this.websiteScanResultProvider.read(websiteScanRef.id);
        const combinedResultsBlobId = websiteScanResult.combinedResultsBlobId ?? this.guidGenerator.createGuid();
        this.logger.setCommonProperties({
            combinedResultsBlobId,
            websiteScanId: websiteScanRef.id,
        });

        const combinedAxeResults = await this.mergeAxeResults(
            axeScanResults.results,
            combinedResultsBlobId,
            websiteScanResult.combinedResultsBlobId === undefined,
        );
        const report = await this.generateCombinedReport(
            combinedAxeResults,
            websiteScanResult,
            axeScanResults.userAgent,
            axeScanResults.browserResolution,
        );
        await this.updateWebsiteScanResult(websiteScanResult, combinedResultsBlobId, report);

        if (report) {
            pageScanResult.reports.push(report);
        }
    }

    private async generateCombinedReport(
        combinedAxeResults: CombinedScanResults,
        websiteScanResult: WebsiteScanResult,
        userAgent: string,
        browserResolution: string,
    ): Promise<OnDemandPageScanReport> {
        let reportId: string;
        if (websiteScanResult.reports) {
            reportId = websiteScanResult.reports.find((ref) => ref.format === 'consolidated.html')?.reportId;
        }

        reportId = reportId ?? this.guidGenerator.createGuid();
        const scanStarted = new Date(Math.min(...websiteScanResult.pageScans.map((pageScan) => new Date(pageScan.timestamp).valueOf())));

        this.logger.logInfo(`Generating combined reports from scan results.`);
        const report = this.reportGenerator.generateConsolidatedReport(combinedAxeResults, {
            reportId,
            baseUrl: websiteScanResult.baseUrl,
            userAgent,
            browserResolution,
            scanStarted,
        });

        return this.saveScanReport(report);
    }

    private async mergeAxeResults(
        axeScanResults: axe.AxeResults,
        combinedResultsBlobId: string,
        createNew: boolean,
    ): Promise<CombinedScanResults> {
        const blobReadResponse = await this.getOrCreateCombinedResultsBlob(createNew ? undefined : combinedResultsBlobId);
        const combinedScanResults = blobReadResponse.results;

        combinedScanResults.urlCount.total++;
        if (axeScanResults.violations?.length > 0) {
            combinedScanResults.urlCount.failed++;
        } else {
            combinedScanResults.urlCount.passed++;
        }

        this.axeResultsReducer.reduce(combinedScanResults.axeResults, axeScanResults);
        const blobWriteResponse = await this.combinedScanResultsProvider.writeCombinedResults(
            combinedResultsBlobId,
            combinedScanResults,
            blobReadResponse.etag,
        );

        if (blobWriteResponse.error) {
            this.logger.logError('Failed to write new combined axe scan results blob.', {
                error: JSON.stringify(blobWriteResponse.error),
            });

            throw new Error(
                `Failed to write new combined axe scan results blob. Blob Id: ${combinedResultsBlobId} Error: ${JSON.stringify(
                    blobWriteResponse.error,
                )}`,
            );
        }

        return combinedScanResults;
    }

    private async updateWebsiteScanResult(
        websiteScanResult: WebsiteScanResult,
        combinedResultsBlobId: string,
        reportRef: WebsiteScanReport,
    ): Promise<void> {
        const updatedWebsiteScanResults = {
            id: websiteScanResult.id,
            combinedResultsBlobId: combinedResultsBlobId,
            reports: [reportRef],
            _etag: websiteScanResult._etag,
        } as Partial<WebsiteScanResult>;
        try {
            this.websiteScanResultProvider.mergeOrCreate(updatedWebsiteScanResults);
            this.logger.logInfo('Successfully updated website scan results with combined result metadata.');
        } catch (error) {
            this.logger.logError('Failed to update website scan results with combined result metadata.', {
                error: System.serializeError(error),
            });

            throw new Error(
                `Failed to update website scan results with combined result metadata. Document Id: ${
                    websiteScanResult.id
                } Error: ${System.serializeError(error)}`,
            );
        }
    }

    private async updateScanRunState(scanId: string): Promise<OnDemandPageScanResult> {
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

    private async getOrCreateCombinedResultsBlob(combinedResultsBlobId: string | undefined): Promise<CombinedScanResultsReadResponse> {
        if (combinedResultsBlobId === undefined) {
            this.logger.logInfo('No combined axe scan results blob associated with this website scan. Creating a new blob.');

            return this.combinedScanResultsProvider.getEmptyResponse();
        }

        const response = await this.combinedScanResultsProvider.readCombinedResults(combinedResultsBlobId);
        if (response.error?.errorCode === 'blobNotFound') {
            this.logger.logWarn('Combined axe scan results not found in a blob storage. Creating a new blob.');

            return this.combinedScanResultsProvider.getEmptyResponse();
        } else if (response.error) {
            this.logger.logError('Failed to read combined axe results blob.', {
                error: JSON.stringify(response.error),
            });

            throw new Error(
                `Failed to read combined axe results blob. Blob Id: ${combinedResultsBlobId} Error: ${JSON.stringify(response.error)}`,
            );
        }

        this.logger.logInfo('Successfully retrieved combined axe scan results from a blob storage.');

        return response;
    }

    private async scan(pageScanResult: Partial<OnDemandPageScanResult>, page: Page): Promise<AxeScanResults> {
        const axeScanResults = await this.scanner.scan(page);
        if (isNil(axeScanResults.error)) {
            pageScanResult.run = this.createRunResult('completed');
            pageScanResult.scanResult = this.getScanStatus(axeScanResults);
            pageScanResult.reports = await this.generateAndSaveScanReports(axeScanResults);
            if (axeScanResults.scannedUrl !== undefined) {
                pageScanResult.scannedUrl = axeScanResults.scannedUrl;
            }
        } else {
            pageScanResult.run = this.createRunResult('failed', axeScanResults.error);

            this.logger.logError('Browser has failed to scan a page.', { error: JSON.stringify(axeScanResults.error) });
            this.logger.trackEvent('BrowserScanFailed', undefined, { failedBrowserScans: 1 });
        }

        pageScanResult.run.pageTitle = axeScanResults.pageTitle;
        pageScanResult.run.pageResponseCode = axeScanResults.pageResponseCode;

        return axeScanResults.error ? undefined : axeScanResults;
    }

    private async queueScanCompletionNotification(pageScanResult: OnDemandPageScanResult): Promise<void> {
        const featureFlags = await this.getDefaultFeatureFlags();
        this.logger.logInfo(`The 'sendNotification' feature flag is set to ${featureFlags.sendNotification}.`);
        if (featureFlags.sendNotification && !isEmpty(pageScanResult?.notification?.scanNotifyUrl)) {
            this.logger.logInfo(`Queuing scan completion notification queue message.`, {
                scanNotifyUrl: pageScanResult.notification.scanNotifyUrl,
            });
            await this.notificationDispatcher.sendNotificationMessage(this.createOnDemandNotificationRequestMessage(pageScanResult));
        }
    }

    private async generateAndSaveScanReports(axeResults: AxeScanResults): Promise<OnDemandPageScanReport[]> {
        this.logger.logInfo(`Generating reports from scan results.`);
        const reports = this.reportGenerator.generateReports(axeResults);

        return Promise.all(reports.map(async (report) => this.saveScanReport(report)));
    }

    private async saveScanReport(report: GeneratedReport): Promise<OnDemandPageScanReport> {
        const href = await this.pageScanRunReportProvider.saveReport(report.id, report.content);
        this.logger.logInfo(`The '${report.format}' report saved to a blob storage.`, { reportId: report.id, blobUrl: href });

        return {
            format: report.format,
            href,
            reportId: report.id,
        };
    }

    private createOnDemandNotificationRequestMessage(scanResult: OnDemandPageScanResult): OnDemandNotificationRequestMessage {
        return {
            scanId: scanResult.id,
            scanNotifyUrl: scanResult.notification.scanNotifyUrl,
            runStatus: scanResult.run.state,
            scanStatus: scanResult.scanResult?.state,
        };
    }

    private createRunResult(state: OnDemandPageScanRunState, error?: string | ScanError): OnDemandPageScanRunResult {
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

    private async getDefaultFeatureFlags(): Promise<FeatureFlags> {
        return this.serviceConfig.getConfigValue('featureFlags');
    }

    private async deepScan(scanMetadata: ScanMetadata, pageScanResult: OnDemandPageScanResult): Promise<void> {
        if (scanMetadata.deepScan) {
            await this.deepScanner.runDeepScan(scanMetadata, pageScanResult, this.page);
        }
    }
}
