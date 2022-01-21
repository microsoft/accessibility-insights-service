// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { Page, PrivacyScanResult } from 'scanner-global-library';
import { PrivacyScanMetadata } from '../types/privacy-scan-metadata';
import { PrivacyScanner } from './privacy-scanner';

@injectable()
export class PageScanProcessor {
    public constructor(
        @inject(Page) private readonly page: Page,
        @inject(PrivacyScanner) private readonly privacyScanner: PrivacyScanner,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async scan(scanMetadata: PrivacyScanMetadata): Promise<PrivacyScanResult> {
        let privacyScanResults: PrivacyScanResult;
        try {
            await this.openPage(scanMetadata.url);

            privacyScanResults = await this.runPrivacyScan();
        } finally {
            await this.closePage();
        }

        return privacyScanResults;
    }

    private async runPrivacyScan(): Promise<PrivacyScanResult> {
        const privacyScanResult = await this.privacyScanner.scan(this.page);
        this.logger.logInfo('The privacy scan of a webpage is completed.');

        return privacyScanResult;
    }

    private async openPage(url: string): Promise<void> {
        await this.page.create();
        await this.page.navigateToUrl(url);
    }

    private async closePage(): Promise<void> {
        try {
            await this.page.close();
        } catch (error) {
            this.logger.logError('An error occurred while closing web browser page.', { error: System.serializeError(error) });
        }
    }
}
