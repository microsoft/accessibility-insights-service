// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator } from 'common';
import { inject, injectable } from 'inversify';
import { PrivacyScanResult } from 'scanner-global-library';
import { ConsentResult, Cookie, PrivacyScanCombinedReport } from 'storage-documents';
import { unionBy, flatMap, remove, isEmpty } from 'lodash';

export type PrivacyReportMetadata = {
    scanId: string;
    websiteScanId: string;
    url: string;
};

@injectable()
export class PrivacyReportReducer {
    constructor(@inject(GuidGenerator) private readonly guidGenerator: GuidGenerator) {}

    public reduceResults(
        privacyScanResult: PrivacyScanResult,
        existingCombinedReport: PrivacyScanCombinedReport | undefined,
        metadata: PrivacyReportMetadata,
    ): PrivacyScanCombinedReport {
        let combinedReport = existingCombinedReport ?? this.createNewCombinedReport(metadata);

        if (combinedReport.urls.includes(metadata.url)) {
            combinedReport = this.removeUrlResultsFromReport(combinedReport, metadata.url, privacyScanResult.results?.navigationalUri);
        } else {
            combinedReport.urls.push(metadata.url);
        }

        if (privacyScanResult.error) {
            combinedReport = this.addFailedUrl(privacyScanResult, combinedReport, metadata.url);
        }

        if (privacyScanResult.results) {
            combinedReport = this.addCookieCollectionResults(privacyScanResult, combinedReport);
        }

        combinedReport.finishDateTime = privacyScanResult.results?.finishDateTime ?? new Date();

        return combinedReport;
    }

    private addFailedUrl(
        privacyScanResult: PrivacyScanResult,
        combinedReport: PrivacyScanCombinedReport,
        url: string,
    ): PrivacyScanCombinedReport {
        combinedReport.failedUrls.push({
            url: privacyScanResult.results?.navigationalUri ?? url,
            seedUri: privacyScanResult.results?.seedUri ?? url,
            httpStatusCode: privacyScanResult.pageResponseCode,
            reason: `error=${JSON.stringify(privacyScanResult.error)}`,
            bannerDetected: privacyScanResult.results?.bannerDetected,
            bannerDetectionXpathExpression: privacyScanResult.results?.bannerDetectionXpathExpression,
        });
        combinedReport.status = 'Failed';

        return combinedReport;
    }

    private addCookieCollectionResults(
        privacyScanResult: PrivacyScanResult,
        combinedReport: PrivacyScanCombinedReport,
    ): PrivacyScanCombinedReport {
        combinedReport.cookieCollectionUrlResults.push(privacyScanResult.results);
        privacyScanResult.results.cookieCollectionConsentResults.forEach((consentResult) => {
            combinedReport.scanCookies = unionBy(
                combinedReport.scanCookies,
                this.getCookiesFromConsentResult(consentResult),
                JSON.stringify,
            );
        });

        return combinedReport;
    }

    private getCookiesFromConsentResult(consentResult: ConsentResult): Cookie[] {
        const cookiesBeforeConsent = flatMap(consentResult.cookiesBeforeConsent ?? [], (cookieByDomain) => cookieByDomain.cookies);
        const cookiesAfterConsent = flatMap(consentResult.cookiesAfterConsent ?? [], (cookieByDomain) => cookieByDomain.cookies);

        return unionBy(cookiesBeforeConsent, cookiesAfterConsent, JSON.stringify);
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
        remove(
            report.failedUrls,
            (failedUrl) => failedUrl.url === url || (navigationalUrl !== undefined && failedUrl.url === navigationalUrl),
        );
        remove(
            report.cookieCollectionUrlResults,
            (cookieCollectionResult) =>
                cookieCollectionResult.navigationalUri === url ||
                (navigationalUrl !== undefined && cookieCollectionResult.navigationalUri === navigationalUrl),
        );
        report.status = isEmpty(report.failedUrls) ? 'Completed' : 'Failed';

        return report;
    }
}
