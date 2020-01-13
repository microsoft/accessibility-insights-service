// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export declare type TestEnvironment = 'canary' | 'insider' | 'production';
export declare type TestRunResult = 'pass' | 'fail';

export interface TestRun {
    testContainer: string;
    testName: string;
    result: TestRunResult;
    error?: string;
    timestamp: Date;
}

export interface HealthReport {
    healthStatus: TestRunResult;
    environment: TestEnvironment;
    releaseId: string;
    runId: string;
    testRuns: TestRun[];
    testsPassed: number;
    testsFailed: number;
}
