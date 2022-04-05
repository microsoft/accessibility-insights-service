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
                scanNotificationUrl: `${webApiConfig.baseUrl}${availabilityConfig.scanNotifyApiEndpoint}`,
            },
            initialTestContextData: {
                scanUrl: availabilityConfig.urlToScan,
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
        return {
            readableName: 'ConsolidatedScan',
            scanOptions: {
                scanNotificationUrl: `${webApiConfig.baseUrl}${availabilityConfig.scanNotifyFailApiEndpoint}`,
                consolidatedId: `${availabilityConfig.consolidatedIdBase}-${webApiConfig.releaseId}-consolidated-${Date.now()}`,
            },
            initialTestContextData: {
                scanUrl: availabilityConfig.urlToScan,
            },
            testGroups: {
                scanReportTests: ['ConsolidatedScanReports'],
                postScanCompletionNotificationTests: ['FailedScanNotification'],
            },
        };
    },
    // Failed consolidated scan with notification
    (availabilityConfig: AvailabilityTestConfig, webApiConfig: WebApiConfig): E2EScanScenarioDefinition => {
        return {
            readableName: 'FailedScan',
            scanOptions: {
                scanNotificationUrl: `${webApiConfig.baseUrl}${availabilityConfig.scanNotifyApiEndpoint}`,
                consolidatedId: `${availabilityConfig.consolidatedIdBase}-${webApiConfig.releaseId}-failed-${Date.now()}`,
            },
            initialTestContextData: {
                scanUrl: `${availabilityConfig.urlToScan}invalid-page-url`,
            },
            testGroups: {
                postScanCompletionNotificationTests: ['ScanCompletionNotification'],
            },
        };
    },
    // Deep scan
    (availabilityConfig: AvailabilityTestConfig, webApiConfig: WebApiConfig): E2EScanScenarioDefinition => {
        const baseUrl = availabilityConfig.urlToScan;

        return {
            readableName: 'DeepScan',
            scanOptions: {
                deepScan: true,
                scanNotificationUrl: `${webApiConfig.baseUrl}${availabilityConfig.scanNotifyApiEndpoint}`,
                consolidatedId: `${availabilityConfig.consolidatedIdBase}-${webApiConfig.releaseId}-deepScan-${Date.now()}`,
            },
            initialTestContextData: {
                scanUrl: availabilityConfig.urlToScan,
                expectedCrawledUrls: [baseUrl, `${baseUrl}linked1/`, `${baseUrl}linked2/`, `${baseUrl}linked1/inner-page.html`],
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
        const baseUrl = availabilityConfig.urlToScan;

        return {
            readableName: 'DeepScanKnownPages',
            scanOptions: {
                deepScan: true,
                consolidatedId: `${availabilityConfig.consolidatedIdBase}-${webApiConfig.releaseId}-deepScanKnownPages-${Date.now()}`,
                deepScanOptions: {
                    knownPages: [`${baseUrl}unlinked/`],
                },
            },
            initialTestContextData: {
                scanUrl: availabilityConfig.urlToScan,
                expectedCrawledUrls: [
                    baseUrl,
                    `${baseUrl}linked1/`,
                    `${baseUrl}linked2/`,
                    `${baseUrl}linked1/inner-page.html`,
                    `${baseUrl}unlinked/`,
                    `${baseUrl}unlinked/other.html`,
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
        const baseUrl = availabilityConfig.urlToScan;

        return {
            readableName: 'DeepScanDiscoveryPatterns',
            scanOptions: {
                deepScan: true,
                consolidatedId: `${availabilityConfig.consolidatedIdBase}-${
                    webApiConfig.releaseId
                }-deepScanDiscoveryPatterns-${Date.now()}`,
                deepScanOptions: {
                    discoveryPatterns: [`${baseUrl}linked1[.*]`],
                },
            },
            initialTestContextData: {
                scanUrl: availabilityConfig.urlToScan,
                expectedCrawledUrls: [baseUrl, `${baseUrl}linked1/`, `${baseUrl}linked1/inner-page.html`],
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
                consolidatedId: `${availabilityConfig.consolidatedIdBase}-${webApiConfig.releaseId}-privacy-${Date.now()}`,
                privacyScan: true,
            },
            initialTestContextData: {
                scanUrl: availabilityConfig.urlToScan,
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
