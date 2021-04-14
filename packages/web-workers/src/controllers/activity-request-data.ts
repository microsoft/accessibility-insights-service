// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { TestContextData, TestEnvironment, TestGroupName } from 'functional-tests';
import { AvailabilityTelemetry } from 'logger';
import { PostScanRequestOptions } from 'web-api-client';

export interface ActivityRequestData {
    activityName: string;
    data?: unknown;
}

export interface CreateScanRequestData {
    scanUrl: string;
    scanOptions: PostScanRequestOptions;
}

export interface GetScanResultData {
    scanId: string;
}

export interface GetScanReportData {
    scanId: string;
    reportId: string;
}

export interface TrackAvailabilityData {
    name: string;
    telemetry: AvailabilityTelemetry;
}

export interface TestIdentifier {
    testGroupName: TestGroupName;
    scenarioName: string;
}

export interface RunFunctionalTestGroupData {
    runId: string;
    test: TestIdentifier;
    testContextData: TestContextData;
    environment: TestEnvironment;
}

export interface LogTestRunStartData {
    testsToRun: TestIdentifier[];
    runId: string;
    environmentName: string;
}
