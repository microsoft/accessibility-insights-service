// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { GuidGenerator } from 'common';
import { Logger, LogLevel } from 'logger';
import { OnDemandPageScanRunResultProvider, WebApiErrorCodes } from 'service-library';
import { IMock, It, Mock, Times } from 'typemoq';
import { A11yServiceClient } from 'web-api-client';

import { TestContextData } from '../test-group-data';
import { FunctionalTestGroup } from './functional-test-group';
import { RestApiTestGroup } from './rest-api-test-group';

// tslint:disable: no-empty no-object-literal-type-assertion no-any no-unsafe-any
const reportId = 'reportId';
const scanId = 'scanId';
const scanUrl = 'scanUrl';
let singleTestResult: boolean;

class MockableLogger extends Logger {}

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
        this.testContextData.reports[0].reportId = 'new-report-id';

        return singleTestResult;
    };
}

describe(RestApiTestGroup, () => {
    let testSubject: FunctionalTestGroupStub;
    let a11yServiceClientMock: IMock<A11yServiceClient>;
    let scanRunProviderMock: IMock<OnDemandPageScanRunResultProvider>;
    let loggerMock: IMock<MockableLogger>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let testContextData: TestContextData;

    beforeEach(() => {
        testContextData = {
            scanUrl,
            scanId,
            reports: [{ reportId } as any],
        };
        singleTestResult = true;
        a11yServiceClientMock = Mock.ofType(A11yServiceClient);
        scanRunProviderMock = Mock.ofType(OnDemandPageScanRunResultProvider);
        loggerMock = Mock.ofType(MockableLogger);
        guidGeneratorMock = Mock.ofType(GuidGenerator);

        testSubject = new FunctionalTestGroupStub(
            a11yServiceClientMock.object,
            scanRunProviderMock.object,
            loggerMock.object,
            guidGeneratorMock.object,
        );

        guidGeneratorMock.setup(gm => gm.isValidV6Guid(It.isAny())).returns(() => true);
    });

    it('runs successfully and log info', async () => {
        loggerMock.setup(lm => lm.log('[E2E] Test Group Passed', LogLevel.info, It.isAny())).verifiable(Times.once());

        await testSubject.run(testContextData);

        loggerMock.verifyAll();
    });

    it('test failed and failure info logged', async () => {
        singleTestResult = false;
        loggerMock.setup(lm => lm.log('[E2E] Test Group Failed', LogLevel.info, It.isAny())).verifiable(Times.once());

        await testSubject.run(testContextData);

        loggerMock.verifyAll();
    });

    it('runs and modifies test context data', async () => {
        const res = await testSubject.run(testContextData);
        expect(res.reports[0].reportId).not.toEqual(reportId);
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
        loggerMock.setup(lm => lm.log('[E2E] Validation failed', LogLevel.error, It.isAny())).verifiable(Times.exactly(5));
        loggerMock.setup(lm => lm.log('[E2E] Scan request failed', LogLevel.error, It.isAny())).verifiable(Times.once());
        loggerMock.setup(lm => lm.log('[E2E] Scan response not as expected', LogLevel.error, It.isAny())).verifiable(Times.once());

        testSubject.logErrors();

        loggerMock.verifyAll();
    });
});
