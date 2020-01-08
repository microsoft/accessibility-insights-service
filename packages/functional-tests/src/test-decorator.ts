// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { TestDefinition, TestEnvironment } from './common-types';

// tslint:disable: no-unsafe-any

export const definedTestsMetadataKey = Symbol('definedTests');

export function getDefinedTestsMetadata(target: object): TestDefinition[] {
    const metadata = Reflect.getMetadata(definedTestsMetadataKey, target.constructor) as TestDefinition[];

    return metadata === undefined ? [] : metadata;
}

export function test(
    environments: TestEnvironment,
): (target: object, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
    return (target: object, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor => {
        const metadata = getDefinedTestsMetadata(target);
        metadata.push({
            testContainer: target.constructor.name,
            testName: propertyKey,
            environments: environments,
            testImplFunc: descriptor.value,
        });
        Reflect.defineMetadata(definedTestsMetadataKey, metadata, target.constructor);

        return descriptor;
    };
}
