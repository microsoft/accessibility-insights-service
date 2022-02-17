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

        if (combinedReport.Urls.includes(metadata.url)) {
            combinedReport = this.removeUrlResultsFromReport(combinedReport, metadata.url, scanResults.results?.NavigationalUri);
        } else {
            combinedReport.Urls.push(metadata.url);
        }

        if (scanResults.error) {
            combinedReport = this.addFailedUrl(scanResults, combinedReport, metadata.url);
        }
        if (scanResults.results) {
            combinedReport = this.addCookieCollectionResults(scanResults, combinedReport);
        }

        combinedReport.FinishDateTime = scanResults.results?.FinishDateTime ?? new Date();

        return combinedReport;
    }

    private addFailedUrl(
        scanResults: PrivacyScanResult,
        combinedReport: PrivacyScanCombinedReport,
        url: string,
    ): PrivacyScanCombinedReport {
        combinedReport.FailedUrls.push({
            Url: scanResults.results?.NavigationalUri ?? url,
            SeedUri: scanResults.results?.SeedUri ?? url,
            HttpStatusCode: scanResults.pageResponseCode,
            Reason: `error=${JSON.stringify(scanResults.error)}`,
            BannerDetected: scanResults.results?.BannerDetected,
            BannerDetectionXpathExpression: scanResults.results?.BannerDetectionXpathExpression,
        });
        combinedReport.Status = 'Failed';

        return combinedReport;
    }

    private addCookieCollectionResults(
        scanResults: PrivacyScanResult,
        combinedReport: PrivacyScanCombinedReport,
    ): PrivacyScanCombinedReport {
        combinedReport.CookieCollectionUrlResults.push(scanResults.results);
        scanResults.results.CookieCollectionConsentResults.forEach((consentResult) => {
            combinedReport.ScanCookies = _.unionBy(
                combinedReport.ScanCookies,
                this.getCookiesFromConsentResult(consentResult),
                JSON.stringify,
            );
        });

        return combinedReport;
    }

    private getCookiesFromConsentResult(consentResult: ConsentResult): Cookie[] {
        const cookiesBeforeConsent = _.flatMap(consentResult.CookiesBeforeConsent ?? [], (cookieByDomain) => cookieByDomain.Cookies);
        const cookiesAfterConsent = _.flatMap(consentResult.CookiesAfterConsent ?? [], (cookieByDomain) => cookieByDomain.Cookies);

        return _.unionBy(cookiesBeforeConsent, cookiesAfterConsent, JSON.stringify);
    }

    private createNewCombinedReport(metadata: PrivacyReportMetadata): PrivacyScanCombinedReport {
        return {
            ScanId: metadata.websiteScanId,
            Status: 'Completed',
            Urls: [],
            FailedUrls: [],
            ScanCookies: [],
            CookieCollectionUrlResults: [],
            StartDateTime: this.guidGenerator.getGuidTimestamp(metadata.scanId),
            FinishDateTime: new Date(),
        };
    }

    private removeUrlResultsFromReport(
        report: PrivacyScanCombinedReport,
        url: string,
        navigationalUrl?: string,
    ): PrivacyScanCombinedReport {
        _.remove(
            report.FailedUrls,
            (failedUrl) => failedUrl.Url === url || (navigationalUrl !== undefined && failedUrl.Url === navigationalUrl),
        );
        _.remove(
            report.CookieCollectionUrlResults,
            (cookieCollectionResult) =>
                cookieCollectionResult.NavigationalUri === url ||
                (navigationalUrl !== undefined && cookieCollectionResult.NavigationalUri === navigationalUrl),
        );
        report.Status = _.isEmpty(report.FailedUrls) ? 'Completed' : 'Failed';

        return report;
    }
}
