// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { PrivacyScanResult, BrowserError } from 'scanner-global-library';
import { OnDemandPageScanRunResultProvider, WebsiteScanResultProvider, ReportWriter, GeneratedReport } from 'service-library';
import { OnDemandPageScanReport, OnDemandPageScanResult, OnDemandPageScanRunState, ScanError, WebsiteScanResult } from 'storage-documents';
import { System, ServiceConfiguration, GuidGenerator, ScanRunTimeConfig } from 'common';
import { isEmpty } from 'lodash';
import { ScanMetadataConfig } from '../scan-metadata-config';
import { ScanRunnerTelemetryManager } from '../scan-runner-telemetry-manager';
import { PageScanProcessor } from '../scanner/page-scan-processor';
import { PrivacyScanMetadata } from '../types/privacy-scan-metadata';
import { CombinedPrivacyScanResultProcessor } from '../combined-report/combined-privacy-scan-result-processor';

@injectable()
export class Runner {
    private maxFailedScanRetryCount: number;

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
        await this.init();

        const scanMetadata = this.scanMetadataConfig.getConfig();
        // decode URL back from docker parameter encoding
        scanMetadata.url = decodeURIComponent(scanMetadata.url);

        this.logger.setCommonProperties({ scanId: scanMetadata.id, url: scanMetadata.url });
        this.logger.logInfo('Start privacy scan runner.');

        const pageScanResult = await this.updateScanRunStateToRunning(scanMetadata.id);
        if (pageScanResult === undefined) {
            return;
        }

        this.telemetryManager.trackScanStarted(scanMetadata.id);
        try {
            let websiteScanResult;
            if (pageScanResult.websiteScanRef !== undefined) {
                websiteScanResult = await this.websiteScanResultProvider.read(pageScanResult.websiteScanRef.id, false);
            }

            const privacyScanResults = await this.pageScanProcessor.scan(scanMetadata, pageScanResult, websiteScanResult);
            await this.processScanResult(privacyScanResults, pageScanResult);
        } catch (error) {
            this.setRunResult(pageScanResult, 'failed', error instanceof Error ? error : new Error(System.serializeError(error)));
            this.logger.logError(`The privacy scan processor failed to scan a webpage.`, { error: System.serializeError(error) });
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
        if (privacyScanResult?.unscannable === true) {
            this.setRunResult(pageScanResult, 'unscannable', privacyScanResult.error);
        } else if (isEmpty(privacyScanResult.error)) {
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

        // Retry scan on a banner detection error if retry is available or mark scan as completed otherwise.
        // The banner detection error is not a true scan run error.
        if ((privacyScanResult.error as BrowserError)?.errorType === 'BannerXPathNotDetected') {
            const noRetry = pageScanResult.run?.retryCount >= this.maxFailedScanRetryCount;
            if (noRetry === true) {
                runState = 'completed';
            } else {
                runState = 'failed';
                this.logger.logWarn(`The privacy banner was not detected. Mark a scan for retry.`);
            }
        } else {
            this.logger.logError('Browser has failed to scan a webpage.', { error: System.serializeError(privacyScanResult.error) });
            this.telemetryManager.trackBrowserScanFailed();
        }

        pageScanResult.scanResult = {
            state: 'fail',
        };

        this.setRunResult(pageScanResult, runState, privacyScanResult.error);
    }

    private async updateScanResult(scanMetadata: PrivacyScanMetadata, pageScanResult: Partial<OnDemandPageScanResult>): Promise<void> {
        await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanResult);

        if (pageScanResult.websiteScanRef) {
            const runState =
                pageScanResult.run.state === 'completed' || pageScanResult.run.retryCount >= this.maxFailedScanRetryCount
                    ? pageScanResult.run.state
                    : undefined;

            const updatedWebsiteScanResult: Partial<WebsiteScanResult> = {
                id: pageScanResult.websiteScanRef.id,
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

            await this.websiteScanResultProvider.mergeOrCreate(scanMetadata.id, updatedWebsiteScanResult);
        }
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

    private setRunResult(pageScanResult: OnDemandPageScanResult, state: OnDemandPageScanRunState, error?: Error | ScanError): void {
        pageScanResult.run = {
            ...pageScanResult.run,
            state,
            timestamp: new Date().toJSON(),
            // Should return InternalError type in case of generic exception
            error: error instanceof Error ? ({ errorType: 'InternalError', ...error } as ScanError) : error,
        };
    }

    private async getScanConfig(): Promise<ScanRunTimeConfig> {
        return this.serviceConfig.getConfigValue('scanConfig');
    }

    private async init(): Promise<void> {
        const scanConfig = await this.getScanConfig();
        this.maxFailedScanRetryCount = scanConfig.maxFailedScanRetryCount;
    }
}
