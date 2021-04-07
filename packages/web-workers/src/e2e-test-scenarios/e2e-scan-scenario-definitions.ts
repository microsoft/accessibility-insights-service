// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AvailabilityTestConfig } from 'common';
import { PostScanRequestOptions } from 'web-api-client';
import { WebApiConfig } from '../controllers/web-api-config';
import { E2ETestGroupNames } from '../e2e-test-group-names';

export const E2EScanFactories: E2EScanScenarioDefinitionFactory[] = [
    // Simple scan with notification
    (availabilityConfig: AvailabilityTestConfig, webApiConfig: WebApiConfig): E2EScanScenarioDefinition => {
        return {
            scanRequestDef: {
                url: availabilityConfig.urlToScan,
                options: {
                    scanNotificationUrl: `${webApiConfig.baseUrl}${availabilityConfig.scanNotifyApiEndpoint}`,
                },
            },
            testGroups: {
                postScanSubmissionTests: ['PostScan', 'ScanStatus'],
                postScanCompletionTests: ['ScanPreProcessing', 'ScanQueueing'],
                scanReportTests: ['ScanReports'],
                postScanCompletionNotificationTests: ['ScanCompletionNotification'],
            },
        };
    },
    // Consolidated scan with failed notification
    (availabilityConfig: AvailabilityTestConfig, webApiConfig: WebApiConfig): E2EScanScenarioDefinition => {
        return {
            scanRequestDef: {
                url: availabilityConfig.urlToScan,
                options: {
                    scanNotificationUrl: `${webApiConfig.baseUrl}${availabilityConfig.scanNotifyFailApiEndpoint}`,
                    consolidatedId: `${availabilityConfig.consolidatedIdBase}-${process.env.RELEASE_VERSION}`,
                },
            },
            testGroups: {
                postScanSubmissionTests: [],
                postScanCompletionTests: [],
                scanReportTests: ['ConsolidatedScanReports'],
                postScanCompletionNotificationTests: ['FailedScanNotification'],
            },
        };
    },
];

export type ScanRequestDefinition = {
    url: string;
    options?: PostScanRequestOptions;
};

export type E2EScanScenarioDefinition = {
    scanRequestDef: ScanRequestDefinition;
    testGroups: Partial<E2ETestGroupNames>;
};

export type E2EScanScenarioDefinitionFactory = (
    availabilityConfig: AvailabilityTestConfig,
    webApiConfig: WebApiConfig,
) => E2EScanScenarioDefinition;
