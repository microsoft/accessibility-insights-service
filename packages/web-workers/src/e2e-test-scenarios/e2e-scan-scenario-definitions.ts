// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AvailabilityTestConfig } from 'common';
import { TestContextData } from 'functional-tests';
import { PostScanRequestOptions } from 'web-api-client';
import { WebApiConfig } from '../controllers/web-api-config';
import { E2ETestGroupNames } from '../e2e-test-group-names';

export const E2EScanFactories: E2EScanScenarioDefinitionFactory[] = [
    // Simple scan
    (availabilityConfig: AvailabilityTestConfig, webApiConfig: WebApiConfig): E2EScanScenarioDefinition => {
        return {
            readableName: 'SingleScan',
            scanOptions: {
                privacyScan: true,
            },
            initialTestContextData: {
                scanUrl: availabilityConfig.urlToScan,
            },
            testGroups: {
                postScanSubmissionTests: ['PostScan', 'ScanStatus'],
                postScanCompletionTests: ['SingleScanPostCompletion', 'ScanQueueing'],
                scanReportTests: ['ScanReports'],
            },
        };
    },
    // Deep scan
    (availabilityConfig: AvailabilityTestConfig, webApiConfig: WebApiConfig): E2EScanScenarioDefinition => {
        const baseUrl = availabilityConfig.urlToScan;

        return {
            readableName: 'DeepScan',
            scanOptions: {
                privacyScan: true,
                deepScan: true,
                consolidatedId: `${availabilityConfig.consolidatedIdBase}-${webApiConfig.releaseId}-deepScan-${Date.now()}`,
            },
            initialTestContextData: {
                scanUrl: availabilityConfig.urlToScan,
                expectedCrawledUrls: [baseUrl, `${baseUrl}linked1/`, `${baseUrl}linked2/`, `${baseUrl}linked1/inner-page.html`],
            },
            testGroups: {
                postScanCompletionTests: ['DeepScanStatusConsistency'],
                postDeepScanCompletionTests: ['DeepScanPostCompletion', 'DeepScanReports'],
            },
        };
    },
    // Deep scan with knownPages
    (availabilityConfig: AvailabilityTestConfig, webApiConfig: WebApiConfig): E2EScanScenarioDefinition => {
        const baseUrl = availabilityConfig.urlToScan;

        return {
            readableName: 'DeepScanKnownPages',
            scanOptions: {
                privacyScan: true,
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
                postDeepScanCompletionTests: ['DeepScanPostCompletion', 'DeepScanReports'],
            },
        };
    },
    // Deep scan with discovery pattern
    (availabilityConfig: AvailabilityTestConfig, webApiConfig: WebApiConfig): E2EScanScenarioDefinition => {
        const baseUrl = availabilityConfig.urlToScan;

        return {
            readableName: 'DeepScanDiscoveryPatterns',
            scanOptions: {
                privacyScan: true,
                deepScan: true,
                consolidatedId: `${availabilityConfig.consolidatedIdBase}-${
                    webApiConfig.releaseId
                }-deepScanDiscoveryPatterns-${Date.now()}`,
                deepScanOptions: {
                    discoveryPatterns: [`${baseUrl}linked1(.*)`],
                },
            },
            initialTestContextData: {
                scanUrl: availabilityConfig.urlToScan,
                expectedCrawledUrls: [baseUrl, `${baseUrl}linked1/`, `${baseUrl}linked1/inner-page.html`],
            },
            testGroups: {
                postScanCompletionTests: ['DeepScanStatusConsistency'],
                postDeepScanCompletionTests: ['DeepScanPostCompletion', 'DeepScanReports'],
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
