// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { GuidGenerator } from 'common';
import { IMock, Mock } from 'typemoq';
import * as mockDate from 'mockdate';
import { PrivacyScanResult } from 'scanner-global-library';
import { FailedUrl, PrivacyPageScanReport, PrivacyScanCombinedReport, PrivacyScanStatus } from 'storage-documents';
import _ from 'lodash';
import { PrivacyReportMetadata, PrivacyReportReducer } from './privacy-report-reducer';

describe(PrivacyReportReducer, () => {
    const metadata: PrivacyReportMetadata = {
        scanId: 'scan id',
        websiteScanId: 'website scan id',
        url: 'url',
    };
    const startDate = new Date(1, 2, 3, 4);
    const currentDate = new Date(5, 6, 7, 8);
    const successfulScanResult: PrivacyScanResult = {
        pageResponseCode: 200,
        results: {
            HttpStatusCode: 200,
            FinishDateTime: currentDate,
            NavigationalUri: 'navigational url',
            SeedUri: 'seed url',
            CookieCollectionConsentResults: [
                {
                    CookiesUsedForConsent: 'cookie1=value',
                    CookiesBeforeConsent: [
                        {
                            Domain: 'domain1',
                            Cookies: [{ Name: 'domain1cookie1', Domain: 'domain1' }],
                        },
                    ],
                    CookiesAfterConsent: [
                        {
                            Domain: 'domain1',
                            Cookies: [
                                { Name: 'domain1cookie1', Domain: 'domain1' },
                                { Name: 'domain1cookie2', Domain: 'domain1' },
                            ],
                        },
                        {
                            Domain: 'domain2',
                            Cookies: [{ Name: 'domain2cookie1', Domain: 'domain2' }],
                        },
                    ],
                },
                {
                    CookiesUsedForConsent: 'cookie2=value',
                    CookiesBeforeConsent: [],
                    CookiesAfterConsent: [
                        {
                            Domain: 'domain2',
                            Cookies: [{ Name: 'domain2cookie1', Domain: 'domain2' }],
                        },
                        {
                            Domain: 'domain2',
                            Cookies: [{ Name: 'domain2cookie2', Domain: 'domain2' }],
                        },
                    ],
                },
            ],
            BannerDetected: true,
            BannerDetectionXpathExpression: 'banner xpath',
        },
    };
    const partialScanResult: PrivacyScanResult = {
        pageResponseCode: 200,
        error: 'Page reload error',
        results: {
            ..._.cloneDeep(successfulScanResult.results),
            CookieCollectionConsentResults: [
                ..._.cloneDeep(successfulScanResult.results.CookieCollectionConsentResults),
                {
                    CookiesUsedForConsent: 'cookie3=value',
                    Error: 'First page reload failed',
                },
                {
                    CookiesUsedForConsent: 'cookie4=value',
                    Error: 'Second page reload failed',
                    CookiesBeforeConsent: [
                        {
                            Domain: 'domain3',
                            Cookies: [{ Name: 'domain3cookie1', Domain: 'domain3' }],
                        },
                    ],
                },
            ],
        },
    };
    let guidGeneratorMock: IMock<GuidGenerator>;

    let testSubject: PrivacyReportReducer;

    beforeEach(() => {
        mockDate.set(currentDate);
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        guidGeneratorMock.setup((gg) => gg.getGuidTimestamp(metadata.scanId)).returns(() => startDate);

        testSubject = new PrivacyReportReducer(guidGeneratorMock.object);
    });

    afterEach(() => {
        mockDate.reset();
    });

    describe('Creates new combined report if none is provided', () => {
        it('with successful scan result', () => {
            const expectedReport: PrivacyScanCombinedReport = {
                ScanId: metadata.websiteScanId,
                Status: 'Completed',
                Urls: [metadata.url],
                FailedUrls: [],
                ScanCookies: [
                    { Name: 'domain1cookie1', Domain: 'domain1' },
                    { Name: 'domain1cookie2', Domain: 'domain1' },
                    { Name: 'domain2cookie1', Domain: 'domain2' },
                    { Name: 'domain2cookie2', Domain: 'domain2' },
                ],
                CookieCollectionUrlResults: [successfulScanResult.results],
                StartDateTime: startDate,
                FinishDateTime: currentDate,
            };

            const actualReport = testSubject.reduceResults(successfulScanResult, undefined, metadata);

            expect(actualReport).toEqual(expectedReport);
        });

        it('with failed partial scan result', () => {
            const failedUrl: FailedUrl = {
                Url: partialScanResult.results.NavigationalUri,
                SeedUri: partialScanResult.results.SeedUri,
                HttpStatusCode: partialScanResult.pageResponseCode,
                Reason: 'error="Page reload error"',
                BannerDetected: partialScanResult.results.BannerDetected,
                BannerDetectionXpathExpression: partialScanResult.results.BannerDetectionXpathExpression,
            };

            const expectedReport: PrivacyScanCombinedReport = {
                ScanId: metadata.websiteScanId,
                Status: 'Failed',
                Urls: [metadata.url],
                FailedUrls: [failedUrl],
                ScanCookies: [
                    { Name: 'domain1cookie1', Domain: 'domain1' },
                    { Name: 'domain1cookie2', Domain: 'domain1' },
                    { Name: 'domain2cookie1', Domain: 'domain2' },
                    { Name: 'domain2cookie2', Domain: 'domain2' },
                    { Name: 'domain3cookie1', Domain: 'domain3' },
                ],
                CookieCollectionUrlResults: [partialScanResult.results],
                StartDateTime: startDate,
                FinishDateTime: currentDate,
            };

            const actualReport = testSubject.reduceResults(partialScanResult, undefined, metadata);

            expect(actualReport).toEqual(expectedReport);
        });

        it('with failed scan and no scan results', () => {
            const failedScanResult: PrivacyScanResult = {
                error: 'Browser error',
                pageResponseCode: 404,
            };
            const failedUrl: FailedUrl = {
                Url: metadata.url,
                SeedUri: metadata.url,
                HttpStatusCode: 404,
                Reason: 'error="Browser error"',
                BannerDetected: undefined,
                BannerDetectionXpathExpression: undefined,
            };

            const expectedReport: PrivacyScanCombinedReport = {
                ScanId: metadata.websiteScanId,
                Status: 'Failed',
                Urls: [metadata.url],
                FailedUrls: [failedUrl],
                ScanCookies: [],
                CookieCollectionUrlResults: [],
                StartDateTime: startDate,
                FinishDateTime: currentDate,
            };

            const actualReport = testSubject.reduceResults(failedScanResult, undefined, metadata);

            expect(actualReport).toEqual(expectedReport);
        });
    });

    describe('Combines with existing report', () => {
        let existingReport: PrivacyScanCombinedReport;

        beforeEach(() => {
            existingReport = {
                ScanId: 'report scan id',
                Status: 'Completed',
                Urls: ['url1', 'url2'],
                FailedUrls: [],
                ScanCookies: [
                    { Name: 'domain1cookie1', Domain: 'domain1' },
                    { Name: 'domain2cookie1', Domain: 'domain2' },
                    { Name: 'domain4cookie1', Domain: 'domain4' },
                ],
                CookieCollectionUrlResults: [
                    {
                        HttpStatusCode: 200,
                    } as PrivacyPageScanReport,
                ],
                StartDateTime: new Date(0, 0, 0, 0),
                FinishDateTime: new Date(1, 1, 1, 1),
            };
        });

        it.each(['Completed', 'Failed'] as PrivacyScanStatus[])('with successful scan result and existing report status=%s', (status) => {
            existingReport.Status = status;

            const expectedReport: PrivacyScanCombinedReport = {
                ..._.cloneDeep(existingReport),
                Status: status,
                Urls: [...existingReport.Urls, metadata.url],
                ScanCookies: [
                    ...existingReport.ScanCookies,
                    { Name: 'domain1cookie2', Domain: 'domain1' },
                    { Name: 'domain2cookie2', Domain: 'domain2' },
                ],
                CookieCollectionUrlResults: [...existingReport.CookieCollectionUrlResults, successfulScanResult.results],
                FinishDateTime: currentDate,
            };

            const actualReport = testSubject.reduceResults(successfulScanResult, existingReport, metadata);

            expect(actualReport).toEqual(expectedReport);
        });

        it.each(['Completed', 'Failed'] as PrivacyScanStatus[])(
            'with failed partial scan result and existing report status=%s',
            (status) => {
                existingReport.Status = status;

                const failedUrl: FailedUrl = {
                    Url: partialScanResult.results.NavigationalUri,
                    SeedUri: partialScanResult.results.SeedUri,
                    HttpStatusCode: partialScanResult.pageResponseCode,
                    Reason: 'error="Page reload error"',
                    BannerDetected: partialScanResult.results.BannerDetected,
                    BannerDetectionXpathExpression: partialScanResult.results.BannerDetectionXpathExpression,
                };
                const expectedReport: PrivacyScanCombinedReport = {
                    ..._.cloneDeep(existingReport),
                    Status: 'Failed',
                    Urls: [...existingReport.Urls, metadata.url],
                    ScanCookies: [
                        ...existingReport.ScanCookies,
                        { Name: 'domain1cookie2', Domain: 'domain1' },
                        { Name: 'domain2cookie2', Domain: 'domain2' },
                        { Name: 'domain3cookie1', Domain: 'domain3' },
                    ],
                    CookieCollectionUrlResults: [...existingReport.CookieCollectionUrlResults, partialScanResult.results],
                    FailedUrls: [failedUrl],
                    FinishDateTime: currentDate,
                };

                const actualReport = testSubject.reduceResults(partialScanResult, existingReport, metadata);

                expect(actualReport).toEqual(expectedReport);
            },
        );

        it.each(['Completed', 'Failed'] as PrivacyScanStatus[])(
            'with failed scan, no scan results, and existing report status=%s',
            (status) => {
                existingReport.Status = status;

                const failedScanResult: PrivacyScanResult = {
                    error: 'Browser error',
                    pageResponseCode: 404,
                };
                const failedUrl: FailedUrl = {
                    Url: metadata.url,
                    SeedUri: metadata.url,
                    HttpStatusCode: 404,
                    Reason: 'error="Browser error"',
                };

                const expectedReport: PrivacyScanCombinedReport = {
                    ..._.cloneDeep(existingReport),
                    Status: 'Failed',
                    Urls: [...existingReport.Urls, metadata.url],
                    FailedUrls: [failedUrl],
                    FinishDateTime: currentDate,
                };

                const actualReport = testSubject.reduceResults(failedScanResult, existingReport, metadata);

                expect(actualReport).toEqual(expectedReport);
            },
        );

        it.each([metadata.url, successfulScanResult.results.NavigationalUri])(
            'Replace existing failed results for failed url="%s" if retried scan succeeded',
            (url) => {
                const expectedReport: PrivacyScanCombinedReport = {
                    ..._.cloneDeep(existingReport),
                    Urls: [...existingReport.Urls, metadata.url],
                    Status: 'Completed',
                    ScanCookies: [
                        ...existingReport.ScanCookies,
                        { Name: 'domain1cookie2', Domain: 'domain1' },
                        { Name: 'domain2cookie2', Domain: 'domain2' },
                    ],
                    CookieCollectionUrlResults: [...existingReport.CookieCollectionUrlResults, successfulScanResult.results],
                    FailedUrls: [],
                    FinishDateTime: currentDate,
                };

                existingReport.Urls.push(metadata.url);
                existingReport.FailedUrls.push({
                    Url: url,
                } as FailedUrl);
                existingReport.CookieCollectionUrlResults.push({
                    NavigationalUri: successfulScanResult.results.NavigationalUri,
                    CookieCollectionConsentResults: [{ Error: 'browser error' }],
                } as PrivacyPageScanReport);
                existingReport.Status = 'Failed';

                const actualReport = testSubject.reduceResults(successfulScanResult, existingReport, metadata);

                expect(actualReport).toEqual(expectedReport);
            },
        );

        it('Replace existing failed results if retried scan also failed', () => {
            existingReport.Urls.push(metadata.url);
            existingReport.FailedUrls.push({
                Url: metadata.url,
            } as FailedUrl);

            const failedScanResult: PrivacyScanResult = {
                error: 'Browser error',
                pageResponseCode: 404,
            };
            const failedUrl: FailedUrl = {
                Url: metadata.url,
                SeedUri: metadata.url,
                HttpStatusCode: 404,
                Reason: 'error="Browser error"',
            };

            const expectedReport: PrivacyScanCombinedReport = {
                ..._.cloneDeep(existingReport),
                Status: 'Failed',
                FailedUrls: [failedUrl],
                FinishDateTime: currentDate,
            };

            const actualReport = testSubject.reduceResults(failedScanResult, existingReport, metadata);

            expect(actualReport).toEqual(expectedReport);
        });

        it('Replace existing failed results if retried scan succeeded but other scans have failed', () => {
            const existingFailedUrl = { Url: 'some other url' } as FailedUrl;

            const expectedReport: PrivacyScanCombinedReport = {
                ..._.cloneDeep(existingReport),
                Urls: [...existingReport.Urls, metadata.url],
                Status: 'Failed',
                ScanCookies: [
                    ...existingReport.ScanCookies,
                    { Name: 'domain1cookie2', Domain: 'domain1' },
                    { Name: 'domain2cookie2', Domain: 'domain2' },
                ],
                CookieCollectionUrlResults: [...existingReport.CookieCollectionUrlResults, successfulScanResult.results],
                FailedUrls: [existingFailedUrl],
                FinishDateTime: currentDate,
            };

            existingReport.Urls.push(metadata.url);
            existingReport.FailedUrls = [{ Url: metadata.url }, existingFailedUrl] as FailedUrl[];
            existingReport.CookieCollectionUrlResults.push({
                NavigationalUri: successfulScanResult.results.NavigationalUri,
                CookieCollectionConsentResults: [{ Error: 'browser error' }],
            } as PrivacyPageScanReport);
            existingReport.Status = 'Failed';

            const actualReport = testSubject.reduceResults(successfulScanResult, existingReport, metadata);

            expect(actualReport).toEqual(expectedReport);
        });
    });
});
