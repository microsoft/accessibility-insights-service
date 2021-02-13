// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { FeatureFlags, ServiceConfiguration, System } from 'common';
import { inject, injectable } from 'inversify';
import { isEmpty, isNil } from 'lodash';
import { GlobalLogger } from 'logger';
import { AxeScanResults, Page } from 'scanner-global-library';
import {
    OnDemandPageScanRunResultProvider,
    PageScanRunReportProvider,
    WebsiteScanResultProvider,
    CombinedScanResultsProvider,
} from 'service-library';
import {
    OnDemandNotificationRequestMessage,
    OnDemandPageScanReport,
    OnDemandPageScanResult,
    OnDemandPageScanRunResult,
    OnDemandPageScanRunState,
    OnDemandScanResult,
    ScanError,
} from 'storage-documents';
import { AxeResultsReducer } from 'axe-result-converter';
import { GeneratedReport, ReportGenerator } from '../report-generator/report-generator';
import { ScanMetadataConfig } from '../scan-metadata-config';
import { AxeScanner } from '../scanner/axe-scanner';
import { NotificationQueueMessageSender } from '../sender/notification-queue-message-sender';
import { DeepScanner } from '../scanner/deep-scanner';
import { ScanMetadata } from '../types/scan-metadata';
import { ScanRunnerTelemetryManager } from '../scan-runner-telemetry-manager';
import { CombinedScanResultProcessor } from '../combined-result/combined-scan-result-processor';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class Runner {
    constructor(
        @inject(ScanMetadataConfig) private readonly scanMetadataConfig: ScanMetadataConfig,
        @inject(AxeScanner) private readonly axeScanner: AxeScanner,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(PageScanRunReportProvider) private readonly pageScanRunReportProvider: PageScanRunReportProvider,
        @inject(ReportGenerator) private readonly reportGenerator: ReportGenerator,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(NotificationQueueMessageSender) protected readonly notificationDispatcher: NotificationQueueMessageSender,
        @inject(WebsiteScanResultProvider) protected readonly websiteScanResultProvider: WebsiteScanResultProvider,
        @inject(CombinedScanResultsProvider) protected readonly combinedScanResultsProvider: CombinedScanResultsProvider,
        @inject(AxeResultsReducer) protected readonly axeResultsReducer: AxeResultsReducer,
        @inject(Page) private readonly page: Page,
        @inject(DeepScanner) private readonly deepScanner: DeepScanner,
        @inject(ScanRunnerTelemetryManager) private readonly telemetryManager: ScanRunnerTelemetryManager,
        @inject(CombinedScanResultProcessor) private readonly combinedScanResultProcessor: CombinedScanResultProcessor,
    ) {}

    public async run(): Promise<void> {
        const scanMetadata = this.scanMetadataConfig.getConfig();
        this.logger.setCommonProperties({ scanId: scanMetadata.id, url: scanMetadata.url });
        this.logger.logInfo('Starting page scan task.');

        const pageScanResult = await this.updateScanRunState(scanMetadata.id);
        if (pageScanResult === undefined) {
            return;
        }

        this.telemetryManager.trackScanStarted(scanMetadata.id);

        let axeScanResults: AxeScanResults;
        try {
            await this.openPage(scanMetadata.url);
            axeScanResults = await this.scan(pageScanResult, this.page);
            await this.deepScan(scanMetadata, pageScanResult);
            await this.combinedScanResultProcessor.generateCombinedScanResults(axeScanResults, pageScanResult);
            this.logger.logInfo('The scanner successfully completed a page scan.');
        } catch (error) {
            const errorMessage = System.serializeError(error);
            pageScanResult.run = this.createRunResult('failed', errorMessage);

            this.logger.logError(`The scanner failed to scan a page.`, { error: errorMessage });
            this.telemetryManager.trackScanTaskFailed();
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

    private async scan(pageScanResult: Partial<OnDemandPageScanResult>, page: Page): Promise<AxeScanResults> {
        const axeScanResults = await this.axeScanner.scan(page);
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
            this.telemetryManager.trackBrowserScanFailed();
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
