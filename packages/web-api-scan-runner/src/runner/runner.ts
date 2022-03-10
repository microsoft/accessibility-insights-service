// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { AxeScanResults } from 'scanner-global-library';
import {
    OnDemandPageScanRunResultProvider,
    WebsiteScanResultProvider,
    ReportWriter,
    ReportGeneratorRequestProvider,
} from 'service-library';
import {
    OnDemandPageScanReport,
    OnDemandPageScanResult,
    OnDemandPageScanRunState,
    OnDemandScanResult,
    ScanError,
    WebsiteScanResult,
    WebsiteScanRef,
} from 'storage-documents';
import { System, ServiceConfiguration, GuidGenerator } from 'common';
import { isEmpty, isString } from 'lodash';
import { ReportGenerator } from '../report-generator/report-generator';
import { ScanMetadataConfig } from '../scan-metadata-config';
import { ScanRunnerTelemetryManager } from '../scan-runner-telemetry-manager';
import { CombinedScanResultProcessor } from '../combined-result/combined-scan-result-processor';
import { PageScanProcessor } from '../scanner/page-scan-processor';
import { ScanMetadata } from '../types/scan-metadata';
import { ScanNotificationProcessor } from '../sender/scan-notification-processor';

@injectable()
export class Runner {
    constructor(
        @inject(ScanMetadataConfig) private readonly scanMetadataConfig: ScanMetadataConfig,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(WebsiteScanResultProvider) protected readonly websiteScanResultProvider: WebsiteScanResultProvider,
        @inject(ReportGeneratorRequestProvider) private readonly reportGeneratorRequestProvider: ReportGeneratorRequestProvider,
        @inject(PageScanProcessor) private readonly pageScanProcessor: PageScanProcessor,
        @inject(ReportWriter) protected readonly reportWriter: ReportWriter,
        @inject(ReportGenerator) private readonly reportGenerator: ReportGenerator,
        @inject(CombinedScanResultProcessor) private readonly combinedScanResultProcessor: CombinedScanResultProcessor,
        @inject(ScanNotificationProcessor) protected readonly scanNotificationProcessor: ScanNotificationProcessor,
        @inject(ScanRunnerTelemetryManager) private readonly telemetryManager: ScanRunnerTelemetryManager,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(GuidGenerator) protected readonly guidGenerator: GuidGenerator,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async run(): Promise<void> {
        const scanMetadata = this.scanMetadataConfig.getConfig();
        // decode URL back from docker parameter encoding
        scanMetadata.url = decodeURI(scanMetadata.url);

        this.logger.setCommonProperties({ scanId: scanMetadata.id, url: scanMetadata.url });
        this.logger.logInfo('Starting page scan task.');

        const pageScanResult = await this.updateScanRunStateToRunning(scanMetadata.id);
        if (pageScanResult === undefined) {
            return;
        }

        this.telemetryManager.trackScanStarted(scanMetadata.id);
        try {
            const axeScanResults = await this.pageScanProcessor.scan(scanMetadata, pageScanResult);
            await this.processScanResult(axeScanResults, pageScanResult);
        } catch (error) {
            const errorMessage = System.serializeError(error);
            this.setRunResult(pageScanResult, 'failed', errorMessage);

            this.logger.logError(`The scanner failed to scan a page.`, { error: errorMessage });
            this.telemetryManager.trackScanTaskFailed();
        } finally {
            this.telemetryManager.trackScanCompleted();
        }

        const websiteScanResult = await this.updateScanResult(scanMetadata, pageScanResult);

        if (this.isScanCompleted(pageScanResult)) {
            await this.scanNotificationProcessor.sendScanCompletionNotification(scanMetadata, pageScanResult, websiteScanResult);
        }

        this.logger.logInfo('Page scan task completed.');
    }

    private async processScanResult(axeScanResults: AxeScanResults, pageScanResult: OnDemandPageScanResult): Promise<AxeScanResults> {
        if (isEmpty(axeScanResults.error)) {
            this.setRunResult(pageScanResult, 'completed');
            pageScanResult.scanResult = this.getScanStatus(axeScanResults);
            pageScanResult.reports = await this.generateScanReports(axeScanResults);
            if (axeScanResults.scannedUrl !== undefined) {
                pageScanResult.scannedUrl = axeScanResults.scannedUrl;
            }

            await this.sendGenerateConsolidatedReportRequest(axeScanResults, pageScanResult);
        } else {
            this.setRunResult(pageScanResult, 'failed', axeScanResults.error);

            this.logger.logError('Browser has failed to scan a page.', { error: JSON.stringify(axeScanResults.error) });
            this.telemetryManager.trackBrowserScanFailed();
        }

        pageScanResult.run.pageTitle = axeScanResults.pageTitle;
        pageScanResult.run.pageResponseCode = axeScanResults.pageResponseCode;

        return axeScanResults.error ? undefined : axeScanResults;
    }

    private async updateScanResult(
        scanMetadata: ScanMetadata,
        pageScanResult: Partial<OnDemandPageScanResult>,
    ): Promise<WebsiteScanResult> {
        await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanResult);

        const websiteScanRef = pageScanResult.websiteScanRefs?.find((ref) => ref.scanGroupType === 'deep-scan');
        if (websiteScanRef) {
            const scanConfig = await this.serviceConfig.getConfigValue('scanConfig');
            const runState =
                pageScanResult.run.state === 'completed' || pageScanResult.run.retryCount >= scanConfig.maxFailedScanRetryCount
                    ? pageScanResult.run.state
                    : undefined;

            const updatedWebsiteScanResult: Partial<WebsiteScanResult> = {
                id: websiteScanRef.id,
                pageScans: [
                    {
                        scanId: scanMetadata.id,
                        url: scanMetadata.url,
                        scanState: pageScanResult.scanResult?.state,
                        runState,
                        timestamp: new Date().toJSON(),
                    },
                ],
            };

            return this.websiteScanResultProvider.mergeOrCreate(scanMetadata.id, updatedWebsiteScanResult, true);
        }

        return undefined;
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

        return this.reportWriter.writeBatch(reports);
    }

    private setRunResult(pageScanResult: OnDemandPageScanResult, state: OnDemandPageScanRunState, error?: string | ScanError): void {
        pageScanResult.run = {
            ...pageScanResult.run,
            state,
            timestamp: new Date().toJSON(),
            error: isString(error) ? error.substring(0, 2048) : error,
        };
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

    private async sendGenerateConsolidatedReportRequest(
        axeScanResults: AxeScanResults,
        pageScanResult: OnDemandPageScanResult,
    ): Promise<void> {
        const websiteScanRef = this.getWebsiteScanRefs(pageScanResult);
        if (!websiteScanRef) {
            return;
        }

        // TODO remove after transition phase
        // The transition workflow to support old report generation logic while
        // new scan request documents will be created with websiteScanRef.scanGroupId metadata
        if (websiteScanRef.scanGroupId === undefined) {
            await this.combinedScanResultProcessor.generateCombinedScanResults(axeScanResults, pageScanResult);

            return;
        }

        const reportGeneratorRequest = {
            id: this.guidGenerator.createGuidFromBaseGuid(pageScanResult.id),
            scanId: pageScanResult.id,
            scanGroupId: websiteScanRef.scanGroupId,
            priority: pageScanResult.priority,
            reports: pageScanResult.reports,
        };
        await this.reportGeneratorRequestProvider.writeRequest(reportGeneratorRequest);

        this.logger.logInfo('Sending request to generate consolidated report.', {
            id: reportGeneratorRequest.id,
            scanGroupId: websiteScanRef.scanGroupId,
        });
    }

    private getWebsiteScanRefs(pageScanResult: OnDemandPageScanResult): WebsiteScanRef {
        if (!pageScanResult.websiteScanRefs) {
            return undefined;
        }

        return pageScanResult.websiteScanRefs.find(
            (ref) => ref.scanGroupType === 'consolidated-scan-report' || ref.scanGroupType === 'deep-scan',
        );
    }

    /**
     * The scan is completed if there is no combined report generated
     * or combined report generated via old workflow
     */
    private isScanCompleted(pageScanResult: OnDemandPageScanResult): boolean {
        const websiteScanRef = this.getWebsiteScanRefs(pageScanResult);

        // TODO remove websiteScanRef.scanGroupId === undefined condition
        return websiteScanRef === undefined || websiteScanRef.scanGroupId === undefined;
    }
}
