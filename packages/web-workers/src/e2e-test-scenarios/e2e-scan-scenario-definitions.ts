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
            scanOptions: {
                scanNotificationUrl: `${webApiConfig.baseUrl}${availabilityConfig.scanNotifyFailApiEndpoint}`,
                consolidatedId: `${availabilityConfig.consolidatedIdBase}-${process.env.RELEASE_VERSION}-consolidated-${Date.now()}`,
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
    (availabilityConfig: AvailabilityTestConfig, webApiConfig: WebApiConfig): E2EScanScenarioDefinition => {
        const baseUrl = availabilityConfig.urlToScan;

        return {
            scanOptions: {
                deepScan: true,
                consolidatedId: `${availabilityConfig.consolidatedIdBase}-${process.env.RELEASE_VERSION}-deepScan-${Date.now()}`,
            },
            initialTestContextData: {
                scanUrl: availabilityConfig.urlToScan,
                expectedCrawledUrls: [baseUrl, `${baseUrl}linked1/`, `${baseUrl}linked2/`, `${baseUrl}linked1/inner-page.html`],
            },
            testGroups: {
                postDeepScanCompletionTests: ['DeepScanPostCompletion', 'DeepScanReports', 'ConsolidatedScanReports'],
            },
        };
    },
    (availabilityConfig: AvailabilityTestConfig, webApiConfig: WebApiConfig): E2EScanScenarioDefinition => {
        const baseUrl = availabilityConfig.urlToScan;

        return {
            scanOptions: {
                deepScan: true,
                consolidatedId: `${availabilityConfig.consolidatedIdBase}-${process.env.RELEASE_VERSION}-deepScanKnownPages-${Date.now()}`,
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
                postDeepScanCompletionTests: ['DeepScanPostCompletion', 'DeepScanReports', 'ConsolidatedScanReports'],
            },
        };
    },
    (availabilityConfig: AvailabilityTestConfig, webApiConfig: WebApiConfig): E2EScanScenarioDefinition => {
        const baseUrl = availabilityConfig.urlToScan;

        return {
            scanOptions: {
                deepScan: true,
                consolidatedId: `${availabilityConfig.consolidatedIdBase}-${process.env.RELEASE_VERSION}-deepScanDiscoveryPatterns-${Date.now()}`,
                deepScanOptions: {
                    discoveryPatterns: [`${baseUrl}linked1[.*]`],
                },
            },
            initialTestContextData: {
                scanUrl: availabilityConfig.urlToScan,
                expectedCrawledUrls: [baseUrl, `${baseUrl}linked1/`, `${baseUrl}linked1/inner-page.html`],
            },
            testGroups: {
                postDeepScanCompletionTests: ['DeepScanPostCompletion', 'DeepScanReports', 'ConsolidatedScanReports'],
            },
        };
    },
];

export type E2EScanScenarioDefinition = {
    scanOptions: PostScanRequestOptions;
    testGroups: Partial<E2ETestGroupNames>;
    initialTestContextData: TestContextData;
};

export type E2EScanScenarioDefinitionFactory = (
    availabilityConfig: AvailabilityTestConfig,
    webApiConfig: WebApiConfig,
) => E2EScanScenarioDefinition;
