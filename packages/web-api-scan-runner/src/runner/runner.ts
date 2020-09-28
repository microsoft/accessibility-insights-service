// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { FeatureFlags, GuidGenerator, ServiceConfiguration, System } from 'common';
import { inject, injectable } from 'inversify';
import { isEmpty, isNil } from 'lodash';
import { GlobalLogger, ScanTaskCompletedMeasurements } from 'logger';
import { AxeScanResults } from 'scanner-global-library';
import { OnDemandPageScanRunResultProvider, PageScanRunReportService } from 'service-library';
import {
    OnDemandNotificationRequestMessage,
    OnDemandPageScanReport,
    OnDemandPageScanResult,
    OnDemandPageScanRunResult,
    OnDemandPageScanRunState,
    OnDemandScanResult,
    ScanCompletedNotification,
    ScanError,
} from 'storage-documents';
import { GeneratedReport, ReportGenerator } from '../report-generator/report-generator';
import { ScanMetadataConfig } from '../scan-metadata-config';
import { Scanner } from '../scanner/scanner';
import { NotificationQueueMessageSender } from '../sender/notification-queue-message-sender';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class Runner {
    constructor(
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(ScanMetadataConfig) private readonly scanMetadataConfig: ScanMetadataConfig,
        @inject(Scanner) private readonly scanner: Scanner,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(PageScanRunReportService) private readonly pageScanRunReportService: PageScanRunReportService,
        @inject(ReportGenerator) private readonly reportGenerator: ReportGenerator,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(NotificationQueueMessageSender) protected readonly notificationDispatcher: NotificationQueueMessageSender,
    ) {}

    public async run(): Promise<void> {
        const scanMetadata = this.scanMetadataConfig.getConfig();
        this.logger.setCommonProperties({ scanId: scanMetadata.id });
        this.logger.logInfo('Starting page scan task.');

        this.logger.logInfo(`Updating page scan run state to 'running'.`);
        const pageScanResult: Partial<OnDemandPageScanResult> = {
            id: scanMetadata.id,
            run: {
                state: 'running',
                timestamp: new Date().toJSON(),
                error: null,
            },
            scanResult: null,
            reports: null,
        };
        const response = await this.onDemandPageScanRunResultProvider.tryUpdateScanRun(pageScanResult);
        if (!response.succeeded) {
            this.logger.logInfo(
                `Update page scan run state to 'running' failed due to merge conflict with other process. Exiting page scan task.`,
            );

            return;
        }

        const scanStartedTimestamp: number = Date.now();
        const scanSubmittedTimestamp: number = this.guidGenerator.getGuidTimestamp(scanMetadata.id).getTime();

        this.logger.trackEvent('ScanRequestRunning', undefined, { runningScanRequests: 1 });
        this.logger.trackEvent('ScanTaskStarted', undefined, {
            scanWaitTime: (scanStartedTimestamp - scanSubmittedTimestamp) / 1000,
            startedScanTasks: 1,
        });

        try {
            this.logger.logInfo('Starting the page scanner.');
            await this.scan(pageScanResult, scanMetadata.url);
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

        const fullPageScanResult = await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanResult);

        const featureFlags = await this.getDefaultFeatureFlags();
        this.logger.logInfo(`The 'sendNotification' feature flag is set to ${featureFlags.sendNotification}.`);
        if (featureFlags.sendNotification && !this.isScanNotifyUrlEmpty(fullPageScanResult.notification)) {
            this.logger.logInfo(`Queuing scan completion notification message.`, {
                scanNotifyUrl: fullPageScanResult.notification.scanNotifyUrl,
            });
            await this.notificationDispatcher.sendNotificationMessage(this.createOnDemandNotificationRequestMessage(fullPageScanResult));
        }

        this.logger.logInfo('Page scan task completed.');
    }

    private isScanNotifyUrlEmpty(notification: ScanCompletedNotification): boolean {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        return isEmpty(notification?.scanNotifyUrl);
    }

    private async scan(pageScanResult: Partial<OnDemandPageScanResult>, url: string): Promise<void> {
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

    private async generateAndSaveScanReports(axeResults: AxeScanResults): Promise<OnDemandPageScanReport[]> {
        this.logger.logInfo(`Generating reports from scan results.`);
        const reports = this.reportGenerator.generateReports(axeResults);

        return Promise.all(reports.map(async (report) => this.saveScanReport(report)));
    }

    private async saveScanReport(report: GeneratedReport): Promise<OnDemandPageScanReport> {
        const href = await this.pageScanRunReportService.saveReport(report.id, report.content);
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

    private async getDefaultFeatureFlags(): Promise<FeatureFlags> {
        return this.serviceConfig.getConfigValue('featureFlags');
    }
}
