// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CosmosContainerClient } from 'azure-services';
import { GuidGenerator } from 'common';
import { ContextAwareLogger } from 'logger';
import { IMock, Mock } from 'typemoq';
import { A11yServiceClient } from 'web-api-client';

import { TestContextData } from '../test-group-data';
import { FunctionalTestGroup } from './functional-test-group';
import { RestApiTestGroup } from './rest-api-test-group';

// class FunctionalTestGroupStub extends FunctionalTestGroup {
//     public addTest = (test: () => Promise<void>) => {
//         this.testCases.push(test);
//     };

//     public getTestContextData = () => this.testContextData;
//     public setTestContextData = (testContextData: TestContextData) => (this.testContextData = testContextData);
//     // tslint:disable-next-line: no-empty
//     protected registerTestCases = () => {};
// }

describe(RestApiTestGroup, () => {
    let testSubject: RestApiTestGroup;
    let a11yServiceClientMock: IMock<A11yServiceClient>;
    let cosmosClientMock: IMock<CosmosContainerClient>;
    let loggerMock: IMock<ContextAwareLogger>;
    let guidGeneratorMock: IMock<GuidGenerator>;

    beforeEach(() => {
        a11yServiceClientMock = Mock.ofType(A11yServiceClient);
        cosmosClientMock = Mock.ofType(CosmosContainerClient);
        loggerMock = Mock.ofType(ContextAwareLogger);
        guidGeneratorMock = Mock.ofType(GuidGenerator);

        testSubject = new RestApiTestGroup(
            a11yServiceClientMock.object,
            cosmosClientMock.object,
            loggerMock.object,
            guidGeneratorMock.object,
        );
    });

    describe('run', () => {
        describe('fail on testHel')
    });
});
