// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { AxeScanResults, Page } from 'scanner-global-library';
import { OnDemandPageScanResult, WebsiteScanResult } from 'storage-documents';
import { RunnerScanMetadata } from 'service-library';
import { isEmpty } from 'lodash';
import { AxeScanner } from '../scanner/axe-scanner';
import { PageMetadata, PageMetadataGenerator } from '../website-builder/page-metadata-generator';
import { DeepScanner } from './deep-scanner';

@injectable()
export class PageScanProcessor {
    public constructor(
        @inject(Page) private readonly page: Page,
        @inject(AxeScanner) private readonly axeScanner: AxeScanner,
        @inject(DeepScanner) private readonly deepScanner: DeepScanner,
        @inject(PageMetadataGenerator) private readonly pageMetadataGenerator: PageMetadataGenerator,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async scan(
        runnerScanMetadata: RunnerScanMetadata,
        pageScanResult: OnDemandPageScanResult,
        websiteScanResult: WebsiteScanResult,
    ): Promise<AxeScanResults> {
        let axeScanResults: AxeScanResults;
        try {
            const pageMetadata = await this.pageMetadataGenerator.getMetadata(runnerScanMetadata.url, websiteScanResult);

            const state = this.getScannableState(pageMetadata);
            if (state.unscannable === true) {
                return state;
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

    private getScannableState(pageMetadata: PageMetadata): AxeScanResults {
        // Redirected to foreign no authentication location
        if (pageMetadata.foreignLocation === true && pageMetadata.authentication !== true) {
            this.logger.logWarn(`The scan URL was redirected to foreign location and will not be processed future.`, {
                loadedUrl: pageMetadata.loadedUrl,
            });

            return {
                unscannable: true,
                error: `The scan URL was redirected to foreign location ${pageMetadata.loadedUrl}`,
            };
        }

        return {
            unscannable: false,
        };
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
