// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { GuidGenerator } from 'common';
import { OnDemandPageScanRunResultProvider, WebApiErrorCodes } from 'service-library';
import { IMock, Mock } from 'typemoq';
import { A11yServiceClient } from 'web-api-client';
import { TestContextData } from '../test-group-data';
import { FunctionalTestGroup } from './functional-test-group';

// tslint:disable:  no-any

class FunctionalTestGroupStub extends FunctionalTestGroup {}

describe(FunctionalTestGroup, () => {
    let testSubject: FunctionalTestGroupStub;
    let a11yServiceClientMock: IMock<A11yServiceClient>;
    let scanRunProviderMock: IMock<OnDemandPageScanRunResultProvider>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let testContextData: TestContextData;

    beforeEach(() => {
        testContextData = {
            scanUrl: 'scanUrl',
            scanId: 'scanId',
            reportId: 'reportId',
        };
        a11yServiceClientMock = Mock.ofType(A11yServiceClient);
        scanRunProviderMock = Mock.ofType(OnDemandPageScanRunResultProvider);
        guidGeneratorMock = Mock.ofType(GuidGenerator);

        testSubject = new FunctionalTestGroupStub(a11yServiceClientMock.object, scanRunProviderMock.object, guidGeneratorMock.object);
    });

    it('should set test context', async () => {
        testSubject.setTestContext(testContextData);

        expect(testSubject.testContextData).toEqual(testContextData);
    });

    it('validate ensureResponseSuccessStatusCode()', async () => {
        testSubject.ensureResponseSuccessStatusCode({ statusCode: 204 } as any);

        let pass = false;
        try {
            testSubject.ensureResponseSuccessStatusCode({ statusCode: 404 } as any);
        } catch (error) {
            pass = true;
        }
        expect(pass).toBeTruthy();
    });

    it('validate expectWebApiErrorResponse()', async () => {
        testSubject.expectWebApiErrorResponse(WebApiErrorCodes.resourceNotFound, { statusCode: 404 } as any);

        let pass = false;
        try {
            testSubject.expectWebApiErrorResponse(WebApiErrorCodes.resourceNotFound, { statusCode: 200 } as any);
        } catch (error) {
            pass = true;
        }
        expect(pass).toBeTruthy();
    });
});
