// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { TestEnvironment } from '../common-types';
import { test } from '../test-decorator';
import { FunctionalTestGroup } from './functional-test-group';

// tslint:disable: no-unused-expression

export class FinalizerTestGroup extends FunctionalTestGroup {
    @test(TestEnvironment.all)
    public async functionalTestsFinalizer(): Promise<void> {
        // The last test in a functional test suite to indicated a suite run completion
        return;
    }
}
