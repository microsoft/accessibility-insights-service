// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { AxeScanResults, Page } from 'scanner-global-library';
import { OnDemandPageScanResult, WebsiteScanResult } from 'storage-documents';
import { RunnerScanMetadata } from 'service-library';
import { isEmpty } from 'lodash';
import { AxeScanner } from '../scanner/axe-scanner';
import { createDiscoveryPattern } from '../crawler/discovery-pattern-factory';
import { DeepScanner } from './deep-scanner';

@injectable()
export class PageScanProcessor {
    public constructor(
        @inject(Page) private readonly page: Page,
        @inject(AxeScanner) private readonly axeScanner: AxeScanner,
        @inject(DeepScanner) private readonly deepScanner: DeepScanner,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        private readonly createDiscoveryPatternFn: typeof createDiscoveryPattern = createDiscoveryPattern,
    ) {}

    public async scan(
        runnerScanMetadata: RunnerScanMetadata,
        pageScanResult: OnDemandPageScanResult,
        websiteScanResult: WebsiteScanResult,
    ): Promise<AxeScanResults> {
        let axeScanResults: AxeScanResults;
        try {
            const scannable = await this.canScanLoadedUrl(runnerScanMetadata.url, websiteScanResult);
            if (scannable === false) {
                return {
                    unscannable: true,
                    error: `The scan URL was redirected to foreign location ${this.page.pageAnalysisResult.loadedUrl}`,
                };
            }

            const enableAuthentication = pageScanResult.authentication?.hint !== undefined;
            await this.page.navigate(runnerScanMetadata.url, { enableAuthentication });
            if (enableAuthentication === true) {
                this.setAuthenticationResult(pageScanResult);
            }

            if (!isEmpty(this.page.browserError)) {
                return { error: this.page.browserError, pageResponseCode: this.page.browserError.statusCode };
            }

            const pageState = await this.capturePageState();
            axeScanResults = await this.axeScanner.scan(this.page);
            axeScanResults = { ...axeScanResults, ...pageState };

            await this.deepScanner.runDeepScan(runnerScanMetadata, pageScanResult, websiteScanResult, this.page);
        } finally {
            await this.page.close();
        }

        return axeScanResults;
    }

    private async canScanLoadedUrl(url: string, websiteScanResult: WebsiteScanResult): Promise<boolean> {
        await this.page.analyze(url);
        if (this.page.pageAnalysisResult?.redirection === true) {
            const discoveryPatterns = websiteScanResult?.discoveryPatterns ?? [
                this.createDiscoveryPatternFn(websiteScanResult?.baseUrl ?? url),
            ];
            // eslint-disable-next-line security/detect-non-literal-regexp
            const match = discoveryPatterns.filter((r) => new RegExp(r, 'i').test(this.page.pageAnalysisResult.loadedUrl)).length > 0;
            if (match === false) {
                this.logger.logWarn(`The scan URL was redirected to foreign location and will not be processed future.`, {
                    loadedUrl: this.page.pageAnalysisResult.loadedUrl,
                });
            }

            return match;
        }

        return true;
    }

    private async capturePageState(): Promise<AxeScanResults> {
        const pageScreenshot = await this.page.getPageScreenshot();
        const pageSnapshot = await this.page.getPageSnapshot();

        return {
            pageSnapshot,
            pageScreenshot,
        };
    }

    private setAuthenticationResult(pageScanResult: OnDemandPageScanResult): void {
        const authenticationResult = this.page.authenticationResult;
        if (authenticationResult === undefined) {
            pageScanResult.authentication = {
                ...pageScanResult.authentication,
                state: 'notDetected',
            };
        } else {
            pageScanResult.authentication = {
                ...pageScanResult.authentication,
                detected: authenticationResult.authenticationType,
                state: authenticationResult.authenticated === true ? 'succeeded' : 'failed',
            };
        }
    }
}
