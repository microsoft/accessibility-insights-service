// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { FeatureFlags, GuidGenerator, ServiceConfiguration, System, RetryHelper } from 'common';
import { inject, injectable } from 'inversify';
import { isEmpty, isNil } from 'lodash';
import { GlobalLogger, ScanTaskCompletedMeasurements } from 'logger';
import { AxeScanResults } from 'scanner-global-library';
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
    ) {}

    public async run(): Promise<void> {
        const scanMetadata = this.scanMetadataConfig.getConfig();
        this.logger.setCommonProperties({ scanId: scanMetadata.id });
        this.logger.logInfo('Starting page scan task.');

        this.logger.logInfo(`Updating page scan run state to 'running'.`);
        const partialPageScanResult: Partial<OnDemandPageScanResult> = {
            id: scanMetadata.id,
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
            this.logger.logInfo(
                `Update page scan run state to 'running' failed due to merge conflict with other process. Exiting page scan task.`,
            );

            return;
        }

        const pageScanResult = response.result;
        const scanStartedTimestamp: number = Date.now();
        const scanSubmittedTimestamp: number = this.guidGenerator.getGuidTimestamp(scanMetadata.id).getTime();

        this.logger.trackEvent('ScanRequestRunning', undefined, { runningScanRequests: 1 });
        this.logger.trackEvent('ScanTaskStarted', undefined, {
            scanWaitTime: (scanStartedTimestamp - scanSubmittedTimestamp) / 1000,
            startedScanTasks: 1,
        });

        let axeScanResults: AxeScanResults;
        try {
            this.logger.logInfo('Starting the page scanner.');
            axeScanResults = await this.scan(pageScanResult, scanMetadata.url);
            await this.generateCombinedScanResults(axeScanResults, pageScanResult);
            this.logger.logInfo('The scanner successfully completed a page scan.');
        } catch (error) {
            const errorMessage = System.serializeError(error);
            pageScanResult.run = this.createRunResult('failed', errorMessage);

            this.logger.logError(`The scanner failed to scan a page.`, { error: errorMessage });
            this.logger.trackEvent('ScanRequestFailed', undefined, { failedScanRequests: 1 });
            this.logger.trackEvent('ScanTaskFailed', undefined, { failedScanTasks: 1 });
        } finally {
            const scanCompletedTimestamp: number = Date.now();
            const telemetryMeasurements: ScanTaskCompletedMeasurements = {
                scanExecutionTime: (scanCompletedTimestamp - scanStartedTimestamp) / 1000,
                scanTotalTime: (scanCompletedTimestamp - scanSubmittedTimestamp) / 1000,
                completedScanTasks: 1,
            };
            this.logger.trackEvent('ScanTaskCompleted', undefined, telemetryMeasurements);
            this.logger.trackEvent('ScanRequestCompleted', undefined, { completedScanRequests: 1 });
        }

        await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanResult);
        await this.queueScanCompletionNotification(pageScanResult);

        this.logger.logInfo('Page scan task completed.');
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
        if (pageScanResult.websiteScanRefs === undefined || pageScanResult.websiteScanRefs.length === 0) {
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
        const report = await this.generateCombinedReport(combinedAxeResults, websiteScanResult, axeScanResults.userAgent);
        await this.updateWebsiteScanResult(websiteScanResult, combinedResultsBlobId, report);

        if (report) {
            pageScanResult.reports.push(report);
        }
    }

    private async generateCombinedReport(
        combinedAxeResults: CombinedScanResults,
        websiteScanResult: WebsiteScanResult,
        userAgent: string,
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

    private async scan(pageScanResult: Partial<OnDemandPageScanResult>, url: string): Promise<AxeScanResults> {
        const axeScanResults = await this.scanner.scan(url);
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
}
