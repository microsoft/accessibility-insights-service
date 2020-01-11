// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export declare type TestRunResult = 'Passed' | "Failed';";

export interface TestRun {
    name: string;
    lastRunResult: TestRunResult;
    timeCompleted: Date;
}

export interface HealthReport {
    releaseId: string;
    testRuns: TestRun[];
    testsPassed: number;
    testsFailed: number;
    error?: string;
}
