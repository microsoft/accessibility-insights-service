// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AvailabilityTestConfig } from 'common';
import { E2ETestGroupNames } from '../e2e-test-group-names';

export const E2EScanFactories: E2EScanScenarioDefinitionFactory[] = [
    // Simple scan
    (config: AvailabilityTestConfig): E2EScanScenarioDefinition => {
        return {
            requestOptions: {
                urlToScan: config.urlToScan,
            },
            testGroups: {
                postScanSubmissionTests: ['PostScan', 'ScanStatus'],
                postScanCompletionTests: ['ScanPreProcessing', 'ScanQueueing'],
                scanReportTests: ['ScanReports'],
                postScanCompletionNotificationTests: ['ScanCompletionNotification'],
            },
        };
    },
    // Consolidated scan
    (config: AvailabilityTestConfig): E2EScanScenarioDefinition => {
        return {
            requestOptions: {
                urlToScan: config.urlToScan,
                scanNotificationUrl: config.scanNotifyFailApiEndpoint,
                consolidatedId: `${config.consolidatedIdBase}-${process.env.RELEASE_VERSION}`,
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

export type ScanRequestOptions = {
    urlToScan: string;
    scanNotificationUrl?: string;
    consolidatedId?: string;
};

export type E2EScanScenarioDefinition = {
    requestOptions: ScanRequestOptions;
    testGroups: Partial<E2ETestGroupNames>;
};

export type E2EScanScenarioDefinitionFactory = (config: AvailabilityTestConfig) => E2EScanScenarioDefinition;
