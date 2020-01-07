// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { TestDefinition, TestEnvironment } from './common-types';
import { definedTestsMetadataKey, test } from './test-decorator';

// tslint:disable: no-unsafe-any

class TestGroupStub {
    public testA(): void {
        console.log('Test A');
    }

    @test(TestEnvironment.all)
    public testB(): void {
        console.log('Test B');
    }

    @test(TestEnvironment.canary)
    public testC(): void {
        console.log('Test C');
    }
}

describe(test, () => {
    it('should process method decorator', () => {
        const target = new TestGroupStub();
        const metadata = Reflect.getMetadata(definedTestsMetadataKey, target.constructor) as TestDefinition[];
        expect(2).toEqual(metadata.length);
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
