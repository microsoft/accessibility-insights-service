// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { expect } from 'chai';
import { WebApiErrorCodes } from 'service-library';
import { TestEnvironment } from '../common-types';
import { test } from '../test-decorator';
import { FunctionalTestGroup } from './functional-test-group';

// tslint:disable: no-unused-expression

export class ScanStatusTestGroup extends FunctionalTestGroup {
    @test(TestEnvironment.all)
    public async testGetScanStatus(): Promise<void> {
        const response = await this.a11yServiceClient.getScanStatus(this.testContextData.scanId);

        this.ensureResponseSuccessStatusCode(response);
        expect(response.body.scanId, 'Get Scan Response should return the Scan ID that we queried').to.be.equal(
            this.testContextData.scanId,
        );
    }

    @test(TestEnvironment.all)
    public async testGetScanStatusWithInvalidGuid(): Promise<void> {
        const invalidGuid = '00000000-0000-0000-0000-000000000000';
        const response = await this.a11yServiceClient.getScanStatus(invalidGuid);

        this.expectWebApiErrorResponse(WebApiErrorCodes.invalidResourceId, response);
    }

    // Currently fails because of five minute wait (it assumes the scan id is valid and status was requested too early)
    @test(TestEnvironment.none)
    public async testGetScanStatusWithInvalidScanId(): Promise<void> {
        const invalidGuid: string = '47cd7291-a928-6c96-bdb8-4be18b5a1305';
        const response = await this.a11yServiceClient.getScanStatus(invalidGuid);

        this.expectWebApiErrorResponse(WebApiErrorCodes.resourceNotFound, response);
    }
}
