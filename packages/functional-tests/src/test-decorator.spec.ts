// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { TestDefinition, TestEnvironment } from './common-types';
import { definedTestsMetadataKey, test } from './test-decorator';

// tslint:disable: no-unsafe-any

class TestGroupStub {
    public testA(): void {
        console.log('Invoked test A');
    }

    @test(TestEnvironment.all)
    public testB(): void {
        console.log('Invoked test B');
    }

    @test(TestEnvironment.canary)
    public testC(): void {
        console.log('Invoked test C');
    }
}

describe(test, () => {
    it('should process method decorator', () => {
        const testsCount = 2;
        const target = new TestGroupStub();
        const metadata = Reflect.getMetadata(definedTestsMetadataKey, target.constructor) as TestDefinition[];
        expect(metadata.length).toEqual(testsCount);
        expect({
            testContainer: target.constructor.name,
            testName: 'testB',
            environments: TestEnvironment.all,
            testImplFunc: target.testB,
        }).toEqual(metadata[0]);
        expect({
            testContainer: target.constructor.name,
            testName: 'testC',
            environments: TestEnvironment.canary,
            testImplFunc: target.testC,
        }).toEqual(metadata[1]);
    });
});
