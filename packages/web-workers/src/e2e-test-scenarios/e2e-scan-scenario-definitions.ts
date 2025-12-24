// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AvailabilityTestConfig } from 'common';
import { TestContextData } from 'functional-tests';
import { PostScanRequestOptions } from 'web-api-client';
import { WebApiConfig } from '../controllers/web-api-config';
import { E2ETestGroupNames } from '../e2e-test-group-names';

export const E2EScanFactories: E2EScanScenarioDefinitionFactory[] = [
    // Simple scan with notification
    (availabilityConfig: AvailabilityTestConfig, webApiConfig: WebApiConfig): E2EScanScenarioDefinition => {
        return {
            readableName: 'SingleScan',
            scanOptions: {
                authenticationType: 'bearerToken',
                scanNotificationUrl: `${webApiConfig.baseUrl}${availabilityConfig.scanNotifyApiEndpoint}`,
            },
            initialTestContextData: {
                scanUrl: getE2EScanSiteUrl(availabilityConfig.urlToScan),
            },
            testGroups: {
                postScanSubmissionTests: ['PostScan', 'ScanStatus'],
                postScanCompletionTests: ['SingleScanPostCompletion', 'ScanQueueing'],
                scanReportTests: ['ScanReports'],
                postScanCompletionNotificationTests: ['ScanCompletionNotification'],
            },
        };
    },
    // Consolidated scan with failed notification
    (availabilityConfig: AvailabilityTestConfig, webApiConfig: WebApiConfig): E2EScanScenarioDefinition => {
        const urlToScan = availabilityConfig.urlToScan;

        return {
            readableName: 'ConsolidatedScan',
            scanOptions: {
                authenticationType: 'bearerToken',
                scanNotificationUrl: `${webApiConfig.baseUrl}${availabilityConfig.scanNotifyFailApiEndpoint}`,
                consolidatedId: `${availabilityConfig.consolidatedIdBase}-${webApiConfig.releaseId}-consolidated-${Date.now()}`,
                deepScanOptions: {
                    baseUrl: getE2EScanSiteBaseUrl(urlToScan),
                    knownPages: [getE2EScanSiteUrl(urlToScan, 'unlinked')],
                },
            },
            initialTestContextData: {
                scanUrl: getE2EScanSiteUrl(urlToScan),
            },
            testGroups: {
                scanReportTests: ['ConsolidatedScanReports'],
                postScanCompletionNotificationTests: ['FailedScanNotification'],
            },
        };
    },
    // Deep scan
    (availabilityConfig: AvailabilityTestConfig, webApiConfig: WebApiConfig): E2EScanScenarioDefinition => {
        const urlToScan = availabilityConfig.urlToScan;

        return {
            readableName: 'DeepScan',
            scanOptions: {
                authenticationType: 'bearerToken',
                deepScan: true,
                scanNotificationUrl: `${webApiConfig.baseUrl}${availabilityConfig.scanNotifyApiEndpoint}`,
                consolidatedId: `${availabilityConfig.consolidatedIdBase}-${webApiConfig.releaseId}-deepScan-${Date.now()}`,
                deepScanOptions: {
                    baseUrl: getE2EScanSiteBaseUrl(urlToScan),
                },
            },
            initialTestContextData: {
                scanUrl: getE2EScanSiteUrl(urlToScan),
                expectedCrawledUrls: [
                    getE2EScanSiteUrl(urlToScan),
                    getE2EScanSiteUrl(urlToScan, 'linked1'),
                    getE2EScanSiteUrl(urlToScan, 'linked2'),
                    getE2EScanSiteUrl(urlToScan, 'linked1/inner-page.html'),
                ],
            },
            testGroups: {
                postScanCompletionTests: ['DeepScanStatusConsistency'],
                postDeepScanCompletionTests: [
                    'DeepScanPostCompletion',
                    'DeepScanReports',
                    'ConsolidatedScanReports',
                    'DeepScanPreCompletionNotification',
                ],
                postScanCompletionNotificationTests: ['ScanCompletionNotification'],
            },
        };
    },
    // Deep scan with knownPages
    (availabilityConfig: AvailabilityTestConfig, webApiConfig: WebApiConfig): E2EScanScenarioDefinition => {
        const urlToScan = availabilityConfig.urlToScan;

        return {
            readableName: 'DeepScanKnownPages',
            scanOptions: {
                authenticationType: 'bearerToken',
                deepScan: true,
                consolidatedId: `${availabilityConfig.consolidatedIdBase}-${webApiConfig.releaseId}-deepScanKnownPages-${Date.now()}`,
                deepScanOptions: {
                    baseUrl: getE2EScanSiteBaseUrl(urlToScan),
                    knownPages: [getE2EScanSiteUrl(urlToScan, 'unlinked')],
                },
            },
            initialTestContextData: {
                scanUrl: getE2EScanSiteUrl(urlToScan),
                expectedCrawledUrls: [
                    getE2EScanSiteUrl(urlToScan),
                    getE2EScanSiteUrl(urlToScan, 'linked1'),
                    getE2EScanSiteUrl(urlToScan, 'linked2'),
                    getE2EScanSiteUrl(urlToScan, 'linked1/inner-page.html'),
                    getE2EScanSiteUrl(urlToScan, 'unlinked'),
                    getE2EScanSiteUrl(urlToScan, 'unlinked/other.html'),
                ],
            },
            testGroups: {
                postScanCompletionTests: ['DeepScanStatusConsistency'],
                postDeepScanCompletionTests: ['DeepScanPostCompletion', 'DeepScanReports', 'ConsolidatedScanReports'],
            },
        };
    },
    // Deep scan with discovery pattern
    (availabilityConfig: AvailabilityTestConfig, webApiConfig: WebApiConfig): E2EScanScenarioDefinition => {
        const urlToScan = availabilityConfig.urlToScan;

        return {
            readableName: 'DeepScanDiscoveryPatterns',
            scanOptions: {
                authenticationType: 'bearerToken',
                deepScan: true,
                consolidatedId: `${availabilityConfig.consolidatedIdBase}-${
                    webApiConfig.releaseId
                }-deepScanDiscoveryPatterns-${Date.now()}`,
                deepScanOptions: {
                    baseUrl: getE2EScanSiteBaseUrl(urlToScan),
                    discoveryPatterns: [`${urlToScan}${urlToScan.endsWith('/') ? '' : '/'}linked1(.*)`],
                },
            },
            initialTestContextData: {
                scanUrl: getE2EScanSiteUrl(urlToScan),
                expectedCrawledUrls: [
                    getE2EScanSiteUrl(urlToScan),
                    getE2EScanSiteUrl(urlToScan, 'linked1'),
                    getE2EScanSiteUrl(urlToScan, 'linked1/inner-page.html'),
                ],
            },
            testGroups: {
                postScanCompletionTests: ['DeepScanStatusConsistency'],
                postDeepScanCompletionTests: ['DeepScanPostCompletion', 'DeepScanReports', 'ConsolidatedScanReports'],
            },
        };
    },
    // privacy scan with consolidated report
    (availabilityConfig: AvailabilityTestConfig, webApiConfig: WebApiConfig): E2EScanScenarioDefinition => {
        return {
            readableName: 'PrivacyScan',
            scanOptions: {
                authenticationType: 'bearerToken',
                consolidatedId: `${availabilityConfig.consolidatedIdBase}-${webApiConfig.releaseId}-privacy-${Date.now()}`,
                privacyScan: true,
            },
            initialTestContextData: {
                scanUrl: getE2EScanSiteUrl(availabilityConfig.urlToScan),
            },
            testGroups: {
                scanReportTests: ['PrivacyScanReports'],
            },
        };
    },
];

export type E2EScanScenarioDefinition = {
    readableName: string;
    scanOptions: PostScanRequestOptions;
    testGroups: Partial<E2ETestGroupNames>;
    initialTestContextData: TestContextData;
};

export type E2EScanScenarioDefinitionFactory = (
    availabilityConfig: AvailabilityTestConfig,
    webApiConfig: WebApiConfig,
) => E2EScanScenarioDefinition;

function getE2EScanSiteUrl(url: string, path?: string): string {
    // When accessing the blob endpoint, append index.html explicitly since blob endpoint
    // does not support default document resolution like static website endpoint.
    let fullUrl = url;
    if (path) {
        fullUrl = `${url}${url.endsWith('/') ? '' : '/'}${path}`;
    }

    // If URL already ends with .html, don't append index.html
    if (fullUrl.endsWith('.html')) {
        return fullUrl;
    }

    return `${fullUrl}${fullUrl.endsWith('/') ? '' : '/'}index.html`;
}

/**
 * Extracts the base URL (protocol + host) from a full URL.
 * Example: `https://website.blob.core.windows.net/$web/index.html`
 * returns `https://website.blob.core.windows.net/`
 */
function getE2EScanSiteBaseUrl(url: string): string {
    const urlObj = new URL(url);

    return `${urlObj.protocol}//${urlObj.host}/`;
}
