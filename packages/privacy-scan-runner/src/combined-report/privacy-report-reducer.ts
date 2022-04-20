// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator } from 'common';
import { inject, injectable } from 'inversify';
import { PrivacyScanResult } from 'scanner-global-library';
import { ConsentResult, Cookie, PrivacyScanCombinedReport } from 'storage-documents';
import _ from 'lodash';

export type PrivacyReportMetadata = {
    scanId: string;
    websiteScanId: string;
    url: string;
};

@injectable()
export class PrivacyReportReducer {
    constructor(@inject(GuidGenerator) private readonly guidGenerator: GuidGenerator) {}

    public reduceResults(
        scanResults: PrivacyScanResult,
        existingCombinedReport: PrivacyScanCombinedReport | undefined,
        metadata: PrivacyReportMetadata,
    ): PrivacyScanCombinedReport {
        let combinedReport = existingCombinedReport ?? this.createNewCombinedReport(metadata);

        if (combinedReport.urls.includes(metadata.url)) {
            combinedReport = this.removeUrlResultsFromReport(combinedReport, metadata.url, scanResults.results?.navigationalUri);
        } else {
            combinedReport.urls.push(metadata.url);
        }

        if (scanResults.error) {
            combinedReport = this.addFailedUrl(scanResults, combinedReport, metadata.url);
        }
        if (scanResults.results) {
            combinedReport = this.addCookieCollectionResults(scanResults, combinedReport);
        }

        combinedReport.finishDateTime = scanResults.results?.finishDateTime ?? new Date();

        return combinedReport;
    }

    private addFailedUrl(
        scanResults: PrivacyScanResult,
        combinedReport: PrivacyScanCombinedReport,
        url: string,
    ): PrivacyScanCombinedReport {
        combinedReport.failedUrls.push({
            url: scanResults.results?.navigationalUri ?? url,
            seedUri: scanResults.results?.seedUri ?? url,
            httpStatusCode: scanResults.pageResponseCode,
            reason: `error=${JSON.stringify(scanResults.error)}`,
            bannerDetected: scanResults.results?.bannerDetected,
            bannerDetectionXpathExpression: scanResults.results?.bannerDetectionXpathExpression,
        });
        combinedReport.status = 'Failed';

        return combinedReport;
    }

    private addCookieCollectionResults(
        scanResults: PrivacyScanResult,
        combinedReport: PrivacyScanCombinedReport,
    ): PrivacyScanCombinedReport {
        combinedReport.cookieCollectionUrlResults.push(scanResults.results);
        scanResults.results.cookieCollectionConsentResults.forEach((consentResult) => {
            combinedReport.scanCookies = _.unionBy(
                combinedReport.scanCookies,
                this.getCookiesFromConsentResult(consentResult),
                JSON.stringify,
            );
        });

        return combinedReport;
    }

    private getCookiesFromConsentResult(consentResult: ConsentResult): Cookie[] {
        const cookiesBeforeConsent = _.flatMap(consentResult.cookiesBeforeConsent ?? [], (cookieByDomain) => cookieByDomain.cookies);
        const cookiesAfterConsent = _.flatMap(consentResult.cookiesAfterConsent ?? [], (cookieByDomain) => cookieByDomain.cookies);

        return _.unionBy(cookiesBeforeConsent, cookiesAfterConsent, JSON.stringify);
    }

    private createNewCombinedReport(metadata: PrivacyReportMetadata): PrivacyScanCombinedReport {
        return {
            scanId: metadata.websiteScanId,
            status: 'Completed',
            urls: [],
            failedUrls: [],
            scanCookies: [],
            cookieCollectionUrlResults: [],
            startDateTime: this.guidGenerator.getGuidTimestamp(metadata.scanId),
            finishDateTime: new Date(),
        };
    }

    private removeUrlResultsFromReport(
        report: PrivacyScanCombinedReport,
        url: string,
        navigationalUrl?: string,
    ): PrivacyScanCombinedReport {
        _.remove(
            report.failedUrls,
            (failedUrl) => failedUrl.url === url || (navigationalUrl !== undefined && failedUrl.url === navigationalUrl),
        );
        _.remove(
            report.cookieCollectionUrlResults,
            (cookieCollectionResult) =>
                cookieCollectionResult.navigationalUri === url ||
                (navigationalUrl !== undefined && cookieCollectionResult.navigationalUri === navigationalUrl),
        );
        report.status = _.isEmpty(report.failedUrls) ? 'Completed' : 'Failed';

        return report;
    }
}
