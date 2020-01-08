// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable: no-any
export declare type LogSource = 'e2e';
export declare type TestResult = 'pass' | 'fail';

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
