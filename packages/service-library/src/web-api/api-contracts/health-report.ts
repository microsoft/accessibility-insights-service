// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export declare type TestRunResult = 'pass' | 'fail';

export interface TestRun {
    name: string;
    lastRunResult: TestRunResult;
    timeCompleted: Date;
}

export interface HealthReport {
    buildVersion: string;
    testRuns: TestRun[];
    testsPassed: number;
    testsFailed: number;
    error?: string;
}
