// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { PrivacyScanResult, BrowserError } from 'scanner-global-library';
import { OnDemandPageScanRunResultProvider, WebsiteScanResultProvider, ReportWriter, GeneratedReport } from 'service-library';
import { OnDemandPageScanReport, OnDemandPageScanResult, OnDemandPageScanRunState, ScanError, WebsiteScanResult } from 'storage-documents';
import { System, ServiceConfiguration, GuidGenerator, ScanRunTimeConfig } from 'common';
import { isString, isEmpty } from 'lodash';
import { ScanMetadataConfig } from '../scan-metadata-config';
import { ScanRunnerTelemetryManager } from '../scan-runner-telemetry-manager';
import { PageScanProcessor } from '../scanner/page-scan-processor';
import { PrivacyScanMetadata } from '../types/privacy-scan-metadata';
import { CombinedPrivacyScanResultProcessor } from '../combined-report/combined-privacy-scan-result-processor';

@injectable()
export class Runner {
    constructor(
        @inject(ScanMetadataConfig) private readonly scanMetadataConfig: ScanMetadataConfig,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(WebsiteScanResultProvider) protected readonly websiteScanResultProvider: WebsiteScanResultProvider,
        @inject(PageScanProcessor) private readonly pageScanProcessor: PageScanProcessor,
        @inject(ReportWriter) protected readonly reportWriter: ReportWriter,
        @inject(ScanRunnerTelemetryManager) private readonly telemetryManager: ScanRunnerTelemetryManager,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(CombinedPrivacyScanResultProcessor) private readonly combinedResultProcessor: CombinedPrivacyScanResultProcessor,
    ) {}

    public async run(): Promise<void> {
        const scanMetadata = this.scanMetadataConfig.getConfig();
        // decode URL back from docker parameter encoding
        scanMetadata.url = decodeURI(scanMetadata.url);

        this.logger.setCommonProperties({ scanId: scanMetadata.id, url: scanMetadata.url });
        this.logger.logInfo('Start privacy scan runner.');

        const pageScanResult = await this.updateScanRunStateToRunning(scanMetadata.id);
        if (pageScanResult === undefined) {
            return;
        }

        this.telemetryManager.trackScanStarted(scanMetadata.id);
        try {
            const privacyScanResults = await this.pageScanProcessor.scan(scanMetadata, pageScanResult);
            await this.processScanResult(privacyScanResults, pageScanResult);
        } catch (error) {
            const errorMessage = System.serializeError(error);
            this.setRunResult(pageScanResult, 'failed', errorMessage);

            this.logger.logError(`The privacy scan processor failed to scan a webpage.`, { error: errorMessage });
            this.telemetryManager.trackScanTaskFailed();
        } finally {
            this.telemetryManager.trackScanCompleted();
        }

        await this.updateScanResult(scanMetadata, pageScanResult);

        this.logger.logInfo('Stop privacy scan runner.');
    }

    private async updateScanRunStateToRunning(scanId: string): Promise<OnDemandPageScanResult> {
        this.logger.logInfo(`Updating webpage scan run state to 'running'.`);
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
                `Update webpage scan run state to 'running' failed due to merge conflict with other process. Exiting webpage scan task.`,
            );

            return undefined;
        }

        return response.result;
    }

    private async processScanResult(privacyScanResult: PrivacyScanResult, pageScanResult: OnDemandPageScanResult): Promise<void> {
        if (isEmpty(privacyScanResult.error)) {
            this.onCompletedScan(pageScanResult);
        } else {
            await this.onFailedScan(privacyScanResult, pageScanResult);
        }

        pageScanResult.scannedUrl = privacyScanResult.scannedUrl;
        pageScanResult.run.pageResponseCode = privacyScanResult.pageResponseCode;
        pageScanResult.reports = await this.generateScanReports(privacyScanResult);

        await this.combinedResultProcessor.generateCombinedScanResults(privacyScanResult, pageScanResult);
    }

    private onCompletedScan(pageScanResult: OnDemandPageScanResult): void {
        this.setRunResult(pageScanResult, 'completed');
        pageScanResult.scanResult = {
            state: 'pass',
        };
    }

    private async onFailedScan(privacyScanResult: PrivacyScanResult, pageScanResult: OnDemandPageScanResult): Promise<void> {
        let runState: OnDemandPageScanRunState = 'failed';
        // Retry privacy banner detection or mark scan as completed since banner detection error considered as non-fatal
        if ((privacyScanResult.error as BrowserError)?.errorType === 'BannerXPathNotDetected') {
            const scanConfig = await this.getScanConfig();
            runState = pageScanResult.run?.retryCount >= scanConfig.maxFailedScanRetryCount ? 'completed' : 'failed';
        }

        pageScanResult.scanResult = {
            state: 'fail',
        };

        this.setRunResult(pageScanResult, runState, this.convertToScanError(privacyScanResult.error));
        this.logger.logError('Browser has failed to scan a webpage.', { error: System.serializeError(privacyScanResult.error) });
        this.telemetryManager.trackBrowserScanFailed();
    }

    private async updateScanResult(
        scanMetadata: PrivacyScanMetadata,
        pageScanResult: Partial<OnDemandPageScanResult>,
    ): Promise<WebsiteScanResult> {
        await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanResult);

        const websiteScanRef = pageScanResult.websiteScanRefs?.find((ref) => ref.scanGroupType === 'deep-scan');
        if (websiteScanRef) {
            const scanConfig = await this.getScanConfig();
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

            return this.websiteScanResultProvider.mergeOrCreate(scanMetadata.id, updatedWebsiteScanResult);
        }

        return undefined;
    }

    private async generateScanReports(privacyScanResult: PrivacyScanResult): Promise<OnDemandPageScanReport[]> {
        const reports: GeneratedReport[] = [];
        if (!isEmpty(privacyScanResult.results)) {
            this.logger.logInfo(`Generating privacy scan report for a webpage scan.`);
            reports.push({
                content: JSON.stringify(privacyScanResult.results),
                format: 'json',
                id: this.guidGenerator.createGuid(),
            });
        }

        if (!isEmpty(privacyScanResult.pageScreenshot)) {
            reports.push({
                content: privacyScanResult.pageScreenshot,
                format: 'page.png',
                id: this.guidGenerator.createGuid(),
            });
        }

        if (!isEmpty(privacyScanResult.pageSnapshot)) {
            reports.push({
                content: privacyScanResult.pageSnapshot,
                format: 'page.mhtml',
                id: this.guidGenerator.createGuid(),
            });
        }

        return !isEmpty(reports) ? this.reportWriter.writeBatch(reports) : undefined;
    }

    private convertToScanError(error: Error | BrowserError): ScanError {
        const scanError = error as ScanError;
        if (isEmpty(scanError.errorType)) {
            scanError.errorType = 'InternalError';
        }

        return scanError;
    }

    private setRunResult(pageScanResult: OnDemandPageScanResult, state: OnDemandPageScanRunState, error?: string | ScanError): void {
        pageScanResult.run = {
            ...pageScanResult.run,
            state,
            timestamp: new Date().toJSON(),
            error: isString(error) ? error.substring(0, 2048) : error,
        };
    }

    private async getScanConfig(): Promise<ScanRunTimeConfig> {
        return this.serviceConfig.getConfigValue('scanConfig');
    }
}
