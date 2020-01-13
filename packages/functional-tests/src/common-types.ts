// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { TestRunResult } from 'service-library';

// tslint:disable: no-any

export declare type LogSource = 'TestContainer' | 'TestRun';

export enum TestEnvironment {
    none = 0,
    canary = 1,
    insider = 2,
    production = 4,
    all = 7,
}

export interface TestDefinition {
    testContainer: string;
    testName: string;
    environments: TestEnvironment;
    testImplFunc(...args: any[]): any;
}

export interface TestRunLogProperties {
    logSource: LogSource;
    runId: string;
    releaseId: string;
    environment: string;
    testContainer: string;
    testName: string;
    result: TestRunResult;
    error?: string;
}

export interface TestContainerLogProperties {
    logSource: LogSource;
    runId: string;
    releaseId: string;
    environment: string;
    testContainer: string;
    result: TestRunResult;
}
