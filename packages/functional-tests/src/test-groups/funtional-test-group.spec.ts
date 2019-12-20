// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CosmosContainerClient } from 'azure-services';
import { GuidGenerator } from 'common';
import { Logger } from 'logger';
import { IMock, Mock } from 'typemoq';
import { A11yServiceClient } from 'web-api-client';

import { TestContextData } from '../test-group-data';
import { FunctionalTestGroup } from './functional-test-group';

class FunctionalTestGroupStub extends FunctionalTestGroup {
    public addTest = (test: () => Promise<void>) => {
        this.testCases.push(test);
    };
    // tslint:disable-next-line: no-empty
    protected registerTestCases = () => {};
}

describe(FunctionalTestGroup, () => {
    let testSubject: FunctionalTestGroupStub;
    let a11yServiceClientMock: IMock<A11yServiceClient>;
    let cosmosClientMock: IMock<CosmosContainerClient>;
    let loggerMock: IMock<Logger>;
    let guidGeneratorMock: IMock<GuidGenerator>;

    beforeEach(() => {
        a11yServiceClientMock = Mock.ofType(A11yServiceClient);
        cosmosClientMock = Mock.ofType(CosmosContainerClient);
        loggerMock = Mock.ofType();
        guidGeneratorMock = Mock.ofType(GuidGenerator);

        testSubject = new FunctionalTestGroupStub(null, null, null);
    });
    describe('run', () => {
        const testContextData: TestContextData = {
            scanUrl: 'url',
        };
    });
});
