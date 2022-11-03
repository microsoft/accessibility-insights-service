// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { Page, PrivacyScanResult, BrowserError } from 'scanner-global-library';
import { isEmpty } from 'lodash';
import { PrivacyResults } from './privacy-results';
import { PrivacyScenarioRunner } from './privacy-scenario-runner';

@injectable()
export class PrivacyScannerCore {
    constructor(
        @inject(PrivacyScenarioRunner) private readonly privacyScenarioRunner: PrivacyScenarioRunner,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async scan(url: string, page: Page): Promise<PrivacyScanResult> {
        if (!isEmpty(page.lastBrowserError)) {
            return { error: page.lastBrowserError, pageResponseCode: page.lastBrowserError.statusCode };
        }

        const navigationStatusCode = page.lastNavigationResponse.status();

        let privacyResult: PrivacyResults;
        try {
            privacyResult = await this.privacyScenarioRunner.run(url, page);
        } catch (error) {
            this.logger?.logError('Privacy scan engine error', { error: System.serializeError(error), url: page.url });

            return {
                scannedUrl: page.url,
                error: error instanceof Error ? error : new Error(System.serializeError(error)),
            };
        }

        const scanResult: PrivacyScanResult = {
            results: {
                ...privacyResult,
                httpStatusCode: navigationStatusCode,
                seedUri: url,
            },
            pageResponseCode: navigationStatusCode,
        };

        if (
            page.lastNavigationResponse?.request()?.redirectChain()?.length > 0 ||
            // should compare encoded Urls
            encodeURI(url) !== page.url
        ) {
            this.logger?.logWarn(`Scanning performed on redirected page`, { redirectedUrl: page.url });
            scanResult.scannedUrl = page.url;
        }

        const errors = privacyResult.cookieCollectionConsentResults
            .filter((result) => result.error !== undefined)
            .map((result) => result.error);
        if (!isEmpty(errors)) {
            // use first error to parse/return to the client
            const error = errors[0] as BrowserError;
            scanResult.error = error;
            scanResult.pageResponseCode = error.statusCode;
            scanResult.results.httpStatusCode = error.statusCode;

            this.logger.logError('Failed to collect cookies for test scenario.', {
                url,
                errors: JSON.stringify(errors),
            });
        } else if (privacyResult.bannerDetected === false) {
            scanResult.error = {
                errorType: 'BannerXPathNotDetected',
                message: 'Privacy banner was not detected.',
                stack: new Error().stack,
            };
        }

        return scanResult;
    }
}
