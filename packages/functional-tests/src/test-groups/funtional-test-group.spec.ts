// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { CosmosContainerClient } from 'azure-services';
import { GuidGenerator } from 'common';
import { ContextAwareLogger, LogLevel } from 'logger';
import { IMock, It, Mock, Times } from 'typemoq';
import { A11yServiceClient } from 'web-api-client';

import { WebApiErrorCodes } from 'service-library';
import { TestContextData } from '../test-group-data';
import { FunctionalTestGroup } from './functional-test-group';
import { RestApiTestGroup } from './rest-api-test-group';

// tslint:disable: no-empty no-object-literal-type-assertion no-any no-unsafe-any
const reportId = 'reportId';
const scanId = 'scanId';
const scanUrl = 'scanUrl';

class FunctionalTestGroupStub extends FunctionalTestGroup {
    public makeCalls = async () => {
        await this.a11yServiceClient.checkHealth();
        await this.a11yServiceClient.postScanUrl(scanUrl);
        await this.a11yServiceClient.getScanStatus(scanId);
        await this.a11yServiceClient.getScanReport(scanId, reportId);
    };

    public logErrors = () => {
        this.expectEqual(1, 2);
        this.expectErrorResponse(WebApiErrorCodes.resourceNotFound, { statusCode: 200 } as any);
        this.ensureSuccessStatusCode({ statusCode: 404 } as any);
        this.expectFalse(true);
        this.expectTrue(false);
        this.expectToBeDefined(undefined);
        this.expectToBeNotDefined('hello');
    };

    // tslint:disable-next-line:
    protected registerTestCases(): void {
        this.registerTestCase(async () => this.modifyReportId());
    }

    private readonly modifyReportId = async () => {
        this.testContextData.reportId = 'new-report-id';
    };
}

describe(RestApiTestGroup, () => {
    let testSubject: FunctionalTestGroupStub;
    let a11yServiceClientMock: IMock<A11yServiceClient>;
    let cosmosClientMock: IMock<CosmosContainerClient>;
    let loggerMock: IMock<ContextAwareLogger>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let testContextData: TestContextData;

    beforeEach(() => {
        testContextData = {
            scanUrl,
            scanId,
            reportId,
        };
        a11yServiceClientMock = Mock.ofType(A11yServiceClient);
        cosmosClientMock = Mock.ofType(CosmosContainerClient);
        loggerMock = Mock.ofType(ContextAwareLogger);
        guidGeneratorMock = Mock.ofType(GuidGenerator);

        testSubject = new FunctionalTestGroupStub(
            a11yServiceClientMock.object,
            cosmosClientMock.object,
            loggerMock.object,
            guidGeneratorMock.object,
        );

        guidGeneratorMock.setup(gm => gm.isValidV6Guid(It.isAny())).returns(() => true);
    });

    it('runs and modifies test context data', async () => {
        const res = await testSubject.run(testContextData);
        expect(res.reportId).not.toEqual(reportId);
    });

    it('could make calls with a11yServiceClient', async () => {
        a11yServiceClientMock.setup(acm => acm.checkHealth()).verifiable();
        a11yServiceClientMock.setup(acm => acm.getScanStatus(scanId)).verifiable();
        a11yServiceClientMock.setup(acm => acm.postScanUrl(scanUrl)).verifiable();
        a11yServiceClientMock.setup(acm => acm.getScanReport(scanId, reportId)).verifiable();

        await testSubject.makeCalls();

        a11yServiceClientMock.verifyAll();
    });

    it('could log errors in app insights', () => {
        loggerMock.setup(lm => lm.log('[E2E] Validation failed', It.isAny(), It.isAny())).verifiable(Times.exactly(5));
        loggerMock.setup(lm => lm.log('[E2E] Scan request failed', It.isAny(), It.isAny())).verifiable(Times.once());
        loggerMock.setup(lm => lm.log('[E2E] Scan response not as expected', It.isAny(), It.isAny())).verifiable(Times.once());

        testSubject.logErrors();

        loggerMock.verifyAll();
    });
});
